import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the contract's state
const contractState = {
  lastCredentialId: 0,
  credentialMetadata: new Map(),
  nftOwnership: new Map(),
};

// Mock contract functions
const contractFunctions = {
  'issue-credential': (student: string, credentialType: string, course: string, expirationDate: string, metadataUri: string) => {
    const newCredentialId = contractState.lastCredentialId + 1;
    contractState.credentialMetadata.set(newCredentialId, {
      institution: 'tx-sender',
      student,
      credential_type: credentialType.slice(1, -1),
      course: course.slice(1, -1),
      issue_date: Date.now(),
      expiration_date: expirationDate === 'none' ? null : parseInt(expirationDate),
      metadata_uri: metadataUri.slice(1, -1),
    });
    contractState.nftOwnership.set(newCredentialId, student);
    contractState.lastCredentialId = newCredentialId;
    return { success: true, value: newCredentialId };
  },
  'get-credential-metadata': (credentialId: string) => {
    const metadata = contractState.credentialMetadata.get(parseInt(credentialId.slice(1)));
    return metadata ? { success: true, value: metadata } : { success: false, error: 'Invalid credential' };
  },
  'revoke-credential': (credentialId: string) => {
    const id = parseInt(credentialId.slice(1));
    if (contractState.credentialMetadata.has(id)) {
      contractState.credentialMetadata.delete(id);
      contractState.nftOwnership.delete(id);
      return { success: true, value: true };
    }
    return { success: false, error: 'Invalid credential' };
  },
  'transfer': (credentialId: string, sender: string, recipient: string) => {
    const id = parseInt(credentialId.slice(1));
    if (contractState.nftOwnership.get(id) === sender) {
      contractState.nftOwnership.set(id, recipient);
      return { success: true, value: true };
    }
    return { success: false, error: 'Not authorized' };
  },
};

// Mock contract call function
const mockContractCall = vi.fn((functionName: string, args: any[], sender?: string) => {
  if (functionName in contractFunctions) {
    return contractFunctions[functionName as keyof typeof contractFunctions](...args);
  }
  throw new Error(`Unknown function: ${functionName}`);
});

describe('Academic Credential NFT Contract', () => {
  const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const student = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const institution = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
  
  beforeEach(() => {
    // Reset contract state before each test
    contractState.lastCredentialId = 0;
    contractState.credentialMetadata.clear();
    contractState.nftOwnership.clear();
    mockContractCall.mockClear();
  });
  
  it('should issue a credential', () => {
    const result = mockContractCall(
        'issue-credential',
        [student, '"degree"', '"Computer Science"', 'none', '"https://example.com/metadata"'],
        contractOwner
    );
    expect(result).toEqual({ success: true, value: 1 });
    expect(contractState.credentialMetadata.size).toBe(1);
    expect(contractState.nftOwnership.size).toBe(1);
  });
  
  it('should get credential metadata', () => {
    mockContractCall(
        'issue-credential',
        [student, '"degree"', '"Computer Science"', 'none', '"https://example.com/metadata"'],
        contractOwner
    );
    const result = mockContractCall('get-credential-metadata', ['u1']);
    expect(result).toEqual({
      success: true,
      value: {
        institution: 'tx-sender',
        student: student,
        credential_type: 'degree',
        course: 'Computer Science',
        issue_date: expect.any(Number),
        expiration_date: null,
        metadata_uri: 'https://example.com/metadata',
      },
    });
  });
  
  it('should revoke a credential', () => {
    mockContractCall(
        'issue-credential',
        [student, '"degree"', '"Computer Science"', 'none', '"https://example.com/metadata"'],
        contractOwner
    );
    const result = mockContractCall('revoke-credential', ['u1'], contractOwner);
    expect(result).toEqual({ success: true, value: true });
    expect(contractState.credentialMetadata.size).toBe(0);
    expect(contractState.nftOwnership.size).toBe(0);
  });
  
  it('should allow credential transfer', () => {
    mockContractCall(
        'issue-credential',
        [student, '"degree"', '"Computer Science"', 'none', '"https://example.com/metadata"'],
        contractOwner
    );
    const result = mockContractCall('transfer', ['u1', student, institution], student);
    expect(result).toEqual({ success: true, value: true });
    expect(contractState.nftOwnership.get(1)).toBe(institution);
  });
});
