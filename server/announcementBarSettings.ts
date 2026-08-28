import { asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { announcementBarMessages, announcementBarSettings } from "../drizzle/schema";
import { ANNOUNCEMENT_FONT_VALUES, DEFAULT_ANNOUNCEMENT_BAR, type AnnouncementBarConfiguration, type AnnouncementFont } from "../shared/announcementBar";

let announcementBarSchemaEnsured = false;

function isAnnouncementFont(value: string): value is AnnouncementFont {
  return (ANNOUNCEMENT_FONT_VALUES as readonly string[]).includes(value);
}

/**
 * The deployed app can be connected to a different database than the local
 * workspace. These additive, idempotent statements keep the public read
 * route available in both environments without touching shopper data.
 */
export async function ensureAnnouncementBarSchema(db: any) {
  if (announcementBarSchemaEnsured) return;

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`announcementBarSettings\` (
      \`id\` int NOT NULL,
      \`backgroundColor\` varchar(7) NOT NULL DEFAULT '#f1641e',
      \`textColor\` varchar(7) NOT NULL DEFAULT '#ffffff',
      \`fontFamily\` varchar(24) NOT NULL DEFAULT 'sans',
      \`rotationSeconds\` int NOT NULL DEFAULT 4,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`announcementBarSettings_id\` PRIMARY KEY (\`id\`)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`announcementBarMessages\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`message\` varchar(220) NOT NULL,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`isActive\` int NOT NULL DEFAULT 1,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`announcementBarMessages_id\` PRIMARY KEY (\`id\`)
    )
  `));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `announcement_bar_messages_active_idx` ON `announcementBarMessages` (`isActive`)"));
  await db.execute(sql.raw("CREATE INDEX IF NOT EXISTS `announcement_bar_messages_order_idx` ON `announcementBarMessages` (`sortOrder`)"));
  await db.execute(sql.raw("INSERT IGNORE INTO `announcementBarSettings` (`id`, `backgroundColor`, `textColor`, `fontFamily`, `rotationSeconds`) VALUES (1, '#f1641e', '#ffffff', 'sans', 4)"));

  const currentMessages = await db.select({ id: announcementBarMessages.id }).from(announcementBarMessages).limit(1);
  if (!currentMessages.length) {
    await db.insert(announcementBarMessages).values(DEFAULT_ANNOUNCEMENT_BAR.messages.map((message, sortOrder) => ({ message, sortOrder, isActive: 1 })));
  }
  announcementBarSchemaEnsured = true;
}

function configurationFromRows(settings: any, messages: any[]): AnnouncementBarConfiguration {
  const activeMessages = messages.filter((row) => Number(row.isActive) === 1).map((row) => row.message).filter(Boolean);
  return {
    backgroundColor: /^#[0-9a-f]{6}$/i.test(settings?.backgroundColor ?? "") ? settings.backgroundColor : DEFAULT_ANNOUNCEMENT_BAR.backgroundColor,
    textColor: /^#[0-9a-f]{6}$/i.test(settings?.textColor ?? "") ? settings.textColor : DEFAULT_ANNOUNCEMENT_BAR.textColor,
    fontFamily: isAnnouncementFont(settings?.fontFamily ?? "") ? settings.fontFamily : DEFAULT_ANNOUNCEMENT_BAR.fontFamily,
    rotationSeconds: Number.isInteger(settings?.rotationSeconds) && settings.rotationSeconds >= 2 && settings.rotationSeconds <= 12 ? settings.rotationSeconds : DEFAULT_ANNOUNCEMENT_BAR.rotationSeconds,
    messages: activeMessages.length ? activeMessages : DEFAULT_ANNOUNCEMENT_BAR.messages,
  };
}

export async function getAnnouncementBarConfiguration(db: any) {
  await ensureAnnouncementBarSchema(db);
  const [settings] = await db.select().from(announcementBarSettings).where(sql`${announcementBarSettings.id} = 1`).limit(1);
  const messages = await db.select().from(announcementBarMessages).orderBy(asc(announcementBarMessages.sortOrder), asc(announcementBarMessages.id));
  return configurationFromRows(settings, messages);
}

export async function saveAnnouncementBarConfiguration(db: any, configuration: AnnouncementBarConfiguration) {
  await ensureAnnouncementBarSchema(db);
  await db.transaction(async (tx: any) => {
    await tx.insert(announcementBarSettings).values({
      id: 1,
      backgroundColor: configuration.backgroundColor,
      textColor: configuration.textColor,
      fontFamily: configuration.fontFamily,
      rotationSeconds: configuration.rotationSeconds,
    }).onDuplicateKeyUpdate({
      set: {
        backgroundColor: configuration.backgroundColor,
        textColor: configuration.textColor,
        fontFamily: configuration.fontFamily,
        rotationSeconds: configuration.rotationSeconds,
      },
    });
    await tx.delete(announcementBarMessages);
    await tx.insert(announcementBarMessages).values(configuration.messages.map((message, sortOrder) => ({ message, sortOrder, isActive: 1 })));
  });
  return configuration;
}
