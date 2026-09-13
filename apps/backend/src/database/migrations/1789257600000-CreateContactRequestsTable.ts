import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 3.2 — creates the contact_requests table per architecture.md §Data Model
 * (Contact Requests).
 *
 * One-directional request from sender to receiver. Invariants enforced at the
 * database level:
 *   - UNIQUE (sender_id, receiver_id): at most one request per directed pair,
 *     so duplicate requests are prevented.
 *   - CHECK (sender_id <> receiver_id): a user cannot request themselves.
 *   - CHECK (status IN ('pending','accepted','declined')): validated states.
 *
 * The two per-column indexes serve the two read paths: the inbox listing
 * (filtered by receiver_id) and status filtering (idx_contacts_status).
 * This migration creates the data model only — the endpoints, service logic,
 * and chat-creation-on-accept behavior are introduced alongside it (Task 3.2).
 */
export class CreateContactRequestsTable1789257600000 implements MigrationInterface {
  name = 'CreateContactRequestsTable1789257600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "contact_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sender_id" uuid NOT NULL REFERENCES "users"("id"),
        "receiver_id" uuid NOT NULL REFERENCES "users"("id"),
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_contact_requests_sender_receiver" UNIQUE ("sender_id", "receiver_id"),
        CONSTRAINT "chk_contact_requests_sender_neq_receiver" CHECK ("sender_id" <> "receiver_id"),
        CONSTRAINT "chk_contact_requests_status" CHECK ("status" IN ('pending', 'accepted', 'declined'))
      )
    `)
    await queryRunner.query(
      `CREATE INDEX "idx_contacts_receiver_id" ON "contact_requests" ("receiver_id")`,
    )
    await queryRunner.query(`CREATE INDEX "idx_contacts_status" ON "contact_requests" ("status")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contact_requests"`)
  }
}
