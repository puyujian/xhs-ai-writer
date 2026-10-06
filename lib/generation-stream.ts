/** Buffer the opening heading so arbitrary token boundaries cannot eat its prefix. */
export class GenerationContentStart {
  private pending = '';
  private started = false;

  push(content: string): string {
    if (this.started) return content;
    this.pending += content;
    return this.start(false);
  }

  private start(final: boolean): string {
    // A label prefix is not enough: “标题创作建议” is a preamble, not the requested heading.
    // Wait for a complete line, or EOF, so token boundaries cannot prematurely confirm “标题”.
    const boundary = final ? '(?=\\r?\\n|$)' : '(?=\\r?\\n)';
    const heading = new RegExp('(?:^|\\n)[ \\t]*(?:#{1,6}[ \\t]*)?1[.、．][ \\t]*(?:爆款标题创作|标题创作|生成标题|标题)[ \\t]*(?:\\([ \\t]*\\d+[ \\t]*个[ \\t]*\\)|（[ \\t]*\\d+[ \\t]*个[ \\t]*）)?[ \\t]*(?:[:：][ \\t]*)?' + boundary).exec(this.pending);
    if (!heading) return '';
    this.started = true;
    const start = heading.index + (heading[0].startsWith('\n') ? 1 : 0);
    const result = this.pending.slice(start).replace(/^[ \t]*(?:#{1,6}[ \t]*)?1[.、．][ \t]*/, '## 1. ');
    this.pending = '';
    return result;
  }

  finish(): string {
    // An upstream format deviation must not turn a nonempty answer into an empty success.
    const heading = this.start(true);
    if (heading) return heading;
    const result = this.pending.trim();
    this.pending = '';
    return result;
  }
}
