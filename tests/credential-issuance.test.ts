import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the contract's state
const contractState = {
  courseRequirements: new Map(),
  studentProgress: new Map(),
  issuedCredentials: new Map(),
};

// Mock contract functions
const contractFunctions = {
  'set-course-requirements': (courseId: string, requirements: string) => {
    contractState.courseRequirements.set(courseId.slice(1, -1), JSON.parse(requirements));
    return { success: true, value: true };
  },
  'complete-requirement': (courseId: string, requirement: string) => {
    const key = `${courseId.slice(1, -1)}-tx-sender`;
    const progress = contractState.studentProgress.get(key) || [];
    progress.push(requirement.slice(1, -1));
    contractState.studentProgress.set(key, progress);
    return { success: true, value: true };
  },
  'issue-credential-if-eligible': (courseId: string, credentialType: string) => {
    const requirements = contractState.courseRequirements.get(courseId.slice(1, -1)) || [];
    const progress = contractState.studentProgress.get(`${courseId.slice(1, -1)}-tx-sender`) || [];
    if (requirements.length === progress.length) {
      contractState.issuedCredentials.set(`${courseId.slice(1, -1)}-tx-sender`, {
        credential_type: credentialType.slice(1, -1),
        issue_date: Date.now(),
      });
      return { success: true, value: true };
    }
    return { success: false, error: 'Not authorized' };
  },
  'get-course-requirements': (courseId: string) => {
    const requirements = contractState.courseRequirements.get(courseId.slice(1, -1));
    return requirements ? { success: true, value: { requirements } } : { success: false, error: 'Invalid course' };
  },
  'get-student-progress': (student: string, courseId: string) => {
    const progress = contractState.studentProgress.get(`${courseId.slice(1, -1)}-${student}`);
    return progress ? { success: true, value: { completed_requirements: progress } } : { success: false, error: 'Invalid course' };
  },
  'get-issued-credential': (student: string, courseId: string) => {
    const credential = contractState.issuedCredentials.get(`${courseId.slice(1, -1)}-${student}`);
    return credential ? { success: true, value: credential } : { success: false, error: 'Invalid course' };
  },
};

// Mock contract call function
const mockContractCall = vi.fn((functionName: string, args: any[], sender?: string) => {
  if (functionName in contractFunctions) {
    return contractFunctions[functionName as keyof typeof contractFunctions](...args);
  }
  throw new Error(`Unknown function: ${functionName}`);
});

describe('Credential Issuance Contract', () => {
  const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const student = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const courseId = '"CS101"';
  const requirements = '["assignment1", "assignment2", "final-exam"]';
  
  beforeEach(() => {
    // Reset contract state before each test
    contractState.courseRequirements.clear();
    contractState.studentProgress.clear();
    contractState.issuedCredentials.clear();
    mockContractCall.mockClear();
  });
  
  it('should set course requirements', () => {
    const result = mockContractCall('set-course-requirements', [courseId, requirements], contractOwner);
    expect(result).toEqual({ success: true, value: true });
    expect(contractState.courseRequirements.size).toBe(1);
  });
  
  it('should complete a requirement', () => {
    mockContractCall('set-course-requirements', [courseId, requirements], contractOwner);
    const result = mockContractCall('complete-requirement', [courseId, '"assignment1"'], student);
    expect(result).toEqual({ success: true, value: true });
    expect(contractState.studentProgress.get('CS101-tx-sender')).toEqual(['assignment1']);
  });
  
  it('should get course requirements', () => {
    mockContractCall('set-course-requirements', [courseId, requirements], contractOwner);
    const result = mockContractCall('get-course-requirements', [courseId]);
    expect(result).toEqual({ success: true, value: { requirements: ['assignment1', 'assignment2', 'final-exam'] } });
  });
  
  it('should issue credential if eligible', () => {
    mockContractCall('set-course-requirements', [courseId, requirements], contractOwner);
    mockContractCall('complete-requirement', [courseId, '"assignment1"'], student);
    mockContractCall('complete-requirement', [courseId, '"assignment2"'], student);
    mockContractCall('complete-requirement', [courseId, '"final-exam"'], student);
    
    const result = mockContractCall('issue-credential-if-eligible', [courseId, '"certificate"'], student);
    expect(result).toEqual({ success: true, value: true });
    expect(contractState.issuedCredentials.size).toBe(1);
  });
  
  it('should not issue credential if not eligible', () => {
    mockContractCall('set-course-requirements', [courseId, requirements], contractOwner);
    mockContractCall('complete-requirement', [courseId, '"assignment1"'], student);
    
    const result = mockContractCall('issue-credential-if-eligible', [courseId, '"certificate"'], student);
    expect(result).toEqual({ success: false, error: 'Not authorized' });
    expect(contractState.issuedCredentials.size).toBe(0);
  });;
});
