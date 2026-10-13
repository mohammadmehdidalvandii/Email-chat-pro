import { MigrationInterface, QueryRunner } from 'typeorm'
export class AllowAttachmentNullMessageId1790000000001 implements MigrationInterface {
  name = 'AllowAttachmentNullMessageId1790000000001'
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "attachments" ALTER COLUMN "message_id" DROP NOT NULL`)
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "attachments" ALTER COLUMN "message_id" SET NOT NULL`)
  }
}
