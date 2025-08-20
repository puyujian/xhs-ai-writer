/**
 * 批量同步与分析脚本（最小化改动）
 * 用法：ts-node scripts/sync-xhs.ts noteId1 noteId2 ...
 * 说明：调用内部API完成笔记详情与评论拉取，并生成洞察快照。
 */

async function main() {
  const noteIds = process.argv.slice(2);
  const base = process.env.PRODUCTION_URL || 'http://localhost:3000';
  if (noteIds.length === 0) {
    console.error('用法: ts-node scripts/sync-xhs.ts <noteId> [noteId2 ...]');
    process.exit(1);
  }

  for (const noteId of noteIds) {
    const detail = await fetch(`${base}/api/xhs/detail?noteId=${noteId}`).then(r => r.json());
    const comments = await fetch(`${base}/api/xhs/comments?noteId=${noteId}&pageSize=50&pageIndex=0`).then(r => r.json());
    const insights = await fetch(`${base}/api/xhs/insights?noteId=${noteId}&pageSize=50&pageIndex=0`).then(r => r.json());
    console.log(`[SYNC] ${noteId} -> title=${detail?.data?.title} comments=${comments?.total} sentiment=${insights?.commentAnalysis?.sentiment?.score}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

