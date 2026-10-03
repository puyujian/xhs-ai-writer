/** Buffer the opening heading so arbitrary token boundaries cannot eat its prefix. */
export class GenerationContentStart {
  private pending = '';
  private started = false;

  push(content: string): string {
    if (this.started) return content;
    this.pending += content;
    // Accept Markdown and numbered-list headings; require a title label, not any “1.”.
    const heading = /(?:^|\n)[ \t]*(?:#{1,6}[ \t]*)?1[.、．][ \t]*(?:爆款标题创作|标题创作|生成标题|标题)/.exec(this.pending);
    if (!heading) return '';
    this.started = true;
    const start = heading.index + (heading[0].startsWith('\n') ? 1 : 0);
    const result = this.pending.slice(start).replace(/^[ \t]*(?:#{1,6}[ \t]*)?1[.、．][ \t]*/, '## 1. ');
    this.pending = '';
    return result;
  }

  finish(): string {
    // An upstream format deviation must not turn a nonempty answer into an empty success.
    const result = this.pending.trim();
    this.pending = '';
    return result;
  }
}
