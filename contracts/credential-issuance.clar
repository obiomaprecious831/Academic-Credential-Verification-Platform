;; Credential Issuance Contract

(define-map course-requirements
  { course-id: (string-ascii 100) }
  { requirements: (list 10 (string-ascii 100)) }
)

(define-map student-progress
  { student: principal, course-id: (string-ascii 100) }
  { completed-requirements: (list 10 (string-ascii 100)) }
)

(define-map issued-credentials
  { student: principal, course-id: (string-ascii 100) }
  { credential-type: (string-ascii 20), issue-date: uint }
)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-invalid-course (err u102))

(define-public (set-course-requirements (course-id (string-ascii 100)) (requirements (list 10 (string-ascii 100))))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ok (map-set course-requirements { course-id: course-id } { requirements: requirements }))
  )
)

(define-public (complete-requirement (course-id (string-ascii 100)) (requirement (string-ascii 100)))
  (let
    (
      (course (unwrap! (map-get? course-requirements { course-id: course-id }) err-invalid-course))
      (current-progress (default-to { completed-requirements: (list) } (map-get? student-progress { student: tx-sender, course-id: course-id })))
    )
    (asserts! (is-some (index-of (get requirements course) requirement)) err-invalid-course)
    (ok (map-set student-progress
      { student: tx-sender, course-id: course-id }
      { completed-requirements: (unwrap! (as-max-len? (append (get completed-requirements current-progress) requirement) u10) err-invalid-course) }
    ))
  )
)

(define-public (issue-credential-if-eligible
  (course-id (string-ascii 100))
  (credential-type (string-ascii 20)))
  (let
    (
      (course (unwrap! (map-get? course-requirements { course-id: course-id }) err-invalid-course))
      (progress (unwrap! (map-get? student-progress { student: tx-sender, course-id: course-id }) err-invalid-course))
    )
    (asserts! (is-eq (len (get requirements course)) (len (get completed-requirements progress))) err-not-authorized)
    (ok true)
  )
)

(define-read-only (get-course-requirements (course-id (string-ascii 100)))
  (ok (unwrap! (map-get? course-requirements { course-id: course-id }) err-invalid-course))
)

(define-read-only (get-student-progress (student principal) (course-id (string-ascii 100)))
  (ok (unwrap! (map-get? student-progress { student: student, course-id: course-id }) err-invalid-course))
)

(define-read-only (get-issued-credential (student principal) (course-id (string-ascii 100)))
  (ok (unwrap! (map-get? issued-credentials { student: student, course-id: course-id }) err-invalid-course))
)

