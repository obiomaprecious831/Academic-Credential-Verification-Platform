;; Academic Credential NFT Contract

(define-non-fungible-token academic-credential uint)

(define-data-var last-credential-id uint u0)

(define-map credential-metadata
  { credential-id: uint }
  {
    institution: principal,
    student: principal,
    credential-type: (string-ascii 20),
    course: (string-ascii 100),
    issue-date: uint,
    expiration-date: (optional uint),
    metadata-uri: (string-utf8 256)
  }
)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-invalid-credential (err u102))

(define-public (issue-credential
  (student principal)
  (credential-type (string-ascii 20))
  (course (string-ascii 100))
  (expiration-date (optional uint))
  (metadata-uri (string-utf8 256)))
  (let
    (
      (new-credential-id (+ (var-get last-credential-id) u1))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (try! (nft-mint? academic-credential new-credential-id student))
    (map-set credential-metadata
      { credential-id: new-credential-id }
      {
        institution: tx-sender,
        student: student,
        credential-type: credential-type,
        course: course,
        issue-date: block-height,
        expiration-date: expiration-date,
        metadata-uri: metadata-uri
      }
    )
    (var-set last-credential-id new-credential-id)
    (ok new-credential-id)
  )
)

(define-read-only (get-credential-metadata (credential-id uint))
  (ok (unwrap! (map-get? credential-metadata { credential-id: credential-id }) err-invalid-credential))
)

(define-public (revoke-credential (credential-id uint))
  (let
    (
      (credential (unwrap! (map-get? credential-metadata { credential-id: credential-id }) err-invalid-credential))
    )
    (asserts! (is-eq tx-sender (get institution credential)) err-not-authorized)
    (try! (nft-burn? academic-credential credential-id (get student credential)))
    (map-delete credential-metadata { credential-id: credential-id })
    (ok true)
  )
)

(define-public (transfer (credential-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-authorized)
    (nft-transfer? academic-credential credential-id sender recipient)
  )
)

