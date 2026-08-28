import { trpc } from "@/lib/trpc";
import { ANNOUNCEMENT_FONT_VALUES, announcementFontStack, DEFAULT_ANNOUNCEMENT_BAR, type AnnouncementBarConfiguration } from "@shared/announcementBar";
import { ChevronDown, ChevronUp, Megaphone, Palette, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const fontLabels = {
  sans: "Clean sans serif",
  serif: "Classic serif",
  rounded: "Friendly rounded",
  mono: "Editorial mono",
} as const;

export function AnnouncementBarEditor({ enabled }: { enabled: boolean }) {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.storefront.owner.announcementBar.useQuery(undefined, { enabled, refetchOnWindowFocus: false });
  const [form, setForm] = useState<AnnouncementBarConfiguration>(DEFAULT_ANNOUNCEMENT_BAR);
  const [notice, setNotice] = useState("");
  const save = trpc.storefront.owner.saveAnnouncementBar.useMutation({
    onSuccess: async (configuration) => {
      setForm(configuration);
      setNotice("Announcement bar saved. Visitors will see the new rotation now.");
      await utils.storefront.announcement.get.invalidate();
    },
    onError: (error) => setNotice(error.message || "The announcement bar could not be saved."),
  });

  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data);
  }, [settingsQuery.data]);

  const updateMessage = (index: number, message: string) => setForm((current) => ({ ...current, messages: current.messages.map((item, itemIndex) => itemIndex === index ? message : item) }));
  const moveMessage = (index: number, direction: -1 | 1) => setForm((current) => {
    const destination = index + direction;
    if (destination < 0 || destination >= current.messages.length) return current;
    const messages = [...current.messages];
    [messages[index], messages[destination]] = [messages[destination]!, messages[index]!];
    return { ...current, messages };
  });
  const removeMessage = (index: number) => setForm((current) => current.messages.length === 1 ? current : ({ ...current, messages: current.messages.filter((_, itemIndex) => itemIndex !== index) }));
  const addMessage = () => setForm((current) => current.messages.length >= 20 ? current : ({ ...current, messages: [...current.messages, "New announcement message"] }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    const messages = form.messages.map((message) => message.trim()).filter(Boolean);
    if (!messages.length) { setNotice("Add at least one announcement message."); return; }
    save.mutate({ ...form, messages });
  };

  return <section className="admin-panel admin-announcement">
    <div className="admin-panel__heading"><Megaphone size={20}/><div><p>Storefront message</p><h2>Rotating announcement bar</h2></div></div>
    <p className="admin-muted">This is the slim bar above the Ehode header. Keep one message, or add up to 20 messages that rotate automatically for visitors.</p>
    {settingsQuery.isLoading ? <p className="admin-muted">Loading announcement settings…</p> : <form className="announcement-editor" onSubmit={submit}>
      <div className="announcement-editor__preview" style={{ backgroundColor: form.backgroundColor, color: form.textColor, fontFamily: announcementFontStack(form.fontFamily) }}>Preview: {form.messages[0] || "Your announcement message"}</div>
      <div className="announcement-editor__controls">
        <label><span><Palette size={14}/> Bar colour</span><input type="color" value={form.backgroundColor} onChange={(event) => setForm((current) => ({ ...current, backgroundColor: event.target.value }))}/></label>
        <label><span>Text colour</span><input type="color" value={form.textColor} onChange={(event) => setForm((current) => ({ ...current, textColor: event.target.value }))}/></label>
        <label><span>Font</span><select value={form.fontFamily} onChange={(event) => setForm((current) => ({ ...current, fontFamily: event.target.value as AnnouncementBarConfiguration["fontFamily"] }))}>{ANNOUNCEMENT_FONT_VALUES.map((font) => <option key={font} value={font}>{fontLabels[font]}</option>)}</select></label>
        <label><span>Change every</span><select value={form.rotationSeconds} onChange={(event) => setForm((current) => ({ ...current, rotationSeconds: Number(event.target.value) }))}>{[2, 3, 4, 5, 6, 8, 10, 12].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>
      </div>
      <div className="announcement-editor__messages"><div><strong>Messages</strong><small>{form.messages.length}/20</small></div>{form.messages.map((message, index) => <div className="announcement-editor__message" key={`${index}-${message}`}><span className="announcement-editor__number">{index + 1}</span><input aria-label={`Announcement message ${index + 1}`} maxLength={220} value={message} onChange={(event) => updateMessage(index, event.target.value)}/><div className="announcement-editor__actions"><button type="button" aria-label={`Move message ${index + 1} up`} disabled={index === 0} onClick={() => moveMessage(index, -1)}><ChevronUp size={15}/></button><button type="button" aria-label={`Move message ${index + 1} down`} disabled={index === form.messages.length - 1} onClick={() => moveMessage(index, 1)}><ChevronDown size={15}/></button><button type="button" aria-label={`Delete message ${index + 1}`} disabled={form.messages.length === 1} onClick={() => removeMessage(index)}><Trash2 size={15}/></button></div></div>)}</div>
      <div className="announcement-editor__footer"><button className="admin-small-button" type="button" disabled={form.messages.length >= 20} onClick={addMessage}><Plus size={15}/> Add message</button><button className="admin-primary" disabled={save.isPending}>{save.isPending ? "Saving…" : <><Save size={15}/> Save announcement bar</>}</button></div>
      {notice ? <p className={`admin-notice${save.isError ? " admin-notice--error" : ""}`}>{notice}</p> : null}
    </form>}
  </section>;
}
