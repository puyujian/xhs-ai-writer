'use client';

import { useState } from 'react';
import { XhsNoteDetail, XhsComment } from '@/lib/types';

interface NoteDetailResponse {
  success: boolean;
  noteId: string;
  data: XhsNoteDetail;
  summary: string;
}

interface ProcessedComment {
  id: string;
  content: string;
  createTime: string;
  likeCount: number;
  subCommentCount: number;
  user: {
    userId: string;
    nickname: string;
    avatar: string;
    gender: string;
  };
  subComments: Array<{
    id: string;
    content: string;
    createTime: string;
    likeCount: number;
    user: {
      userId: string;
      nickname: string;
      avatar: string;
      gender: string;
    };
  }>;
}

interface CommentsResponse {
  success: boolean;
  noteId: string;
  pageSize: number;
  pageIndex: number;
  total: number;
  comments: ProcessedComment[];
  summary: string;
}

export default function XhsDetailTestPage() {
  const [noteId, setNoteId] = useState('689c3e96000000001d02a88e'); // 默认测试ID
  const [noteDetail, setNoteDetail] = useState<NoteDetailResponse | null>(null);
  const [comments, setComments] = useState<CommentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取笔记详情
  const fetchNoteDetail = async () => {
    if (!noteId.trim()) {
      setError('请输入笔记ID');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/xhs/detail?noteId=${encodeURIComponent(noteId.trim())}`);
      const data = await response.json();
      
      if (data.success) {
        setNoteDetail(data);
      } else {
        setError(data.error || '获取笔记详情失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取评论
  const fetchComments = async () => {
    if (!noteId.trim()) {
      setError('请输入笔记ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/xhs/comments?noteId=${encodeURIComponent(noteId.trim())}&pageSize=10&pageIndex=0`);
      const data = await response.json();

      if (data.success) {
        setComments(data);
      } else {
        setError(data.error || '获取评论失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 清空结果
  const clearResults = () => {
    setNoteDetail(null);
    setComments(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            小红书笔记详情和评论测试
          </h1>
          
          {/* 输入区域 */}
          <div className="mb-6">
            <label htmlFor="noteId" className="block text-sm font-medium text-gray-700 mb-2">
              笔记ID
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="noteId"
                value={noteId}
                onChange={(e) => setNoteId(e.target.value)}
                placeholder="请输入24位小红书笔记ID"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                onClick={fetchNoteDetail}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '获取中...' : '获取详情'}
              </button>
              <button
                onClick={fetchComments}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '获取中...' : '获取评论'}
              </button>
              <button
                onClick={clearResults}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                清空
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              示例ID: 689c3e96000000001d02a88e
            </p>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* 笔记详情结果 */}
          {noteDetail && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">笔记详情</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{noteDetail.data.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      作者: {noteDetail.data.userInfo.nickName} | 
                      粉丝: {noteDetail.data.userInfo.fansNum} | 
                      位置: {noteDetail.data.userInfo.location}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>点赞: {noteDetail.data.likeNum} | 收藏: {noteDetail.data.favNum}</p>
                    <p>评论: {noteDetail.data.cmtNum} | 分享: {noteDetail.data.shareNum}</p>
                    <p>曝光: {noteDetail.data.impNum} | 阅读: {noteDetail.data.readNum}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">正文内容</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {noteDetail.data.content}
                  </p>
                </div>

                {noteDetail.data.imagesList.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      图片 ({noteDetail.data.imagesList.length}张)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {noteDetail.data.imagesList.slice(0, 8).map((image, index) => (
                        <div key={index} className="aspect-square bg-gray-200 rounded overflow-hidden">
                          <img
                            src={image.url}
                            alt={`图片${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {noteDetail.data.videoInfo && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">视频信息</h4>
                    <div className="text-sm text-gray-600">
                      <p>尺寸: {noteDetail.data.videoInfo.meta.width} x {noteDetail.data.videoInfo.meta.height}</p>
                      <p>时长: {noteDetail.data.videoInfo.meta.duration}秒</p>
                      <p>音量: {noteDetail.data.videoInfo.volume}</p>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <p>创建时间: {noteDetail.data.createTime}</p>
                  <p>笔记链接: <a href={noteDetail.data.noteLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">查看原文</a></p>
                </div>
              </div>
            </div>
          )}

          {/* 评论结果 */}
          {comments && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                评论列表 ({comments.total}条)
              </h2>
              <div className="space-y-4">
                {comments.comments.map((comment, index) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={comment.user.avatar}
                        alt={comment.user.nickname}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iI0Y3RjhGOSIvPjxwYXRoIGQ9Ik0xNiAyMEMxOC4yMDkxIDIwIDIwIDIxLjc5MDkgMjAgMjRIMTJDMTIgMjEuNzkwOSAxMy43OTA5IDIwIDE2IDIwWiIgZmlsbD0iIzlDQTNBRiIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTIiIHI9IjQiIGZpbGw9IiM5Q0EzQUYiLz48L3N2Zz4=';
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {comment.user.nickname}
                          </span>
                          <span className="text-xs text-gray-500">
                            {comment.createTime}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm mb-2">
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>👍 {comment.likeCount}</span>
                          {comment.subCommentCount > 0 && (
                            <span>💬 {comment.subCommentCount}条回复</span>
                          )}
                        </div>

                        {/* 子评论 */}
                        {comment.subComments && comment.subComments.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-gray-200">
                            {comment.subComments.map((subComment) => (
                              <div key={subComment.id} className="mb-2 last:mb-0">
                                <div className="flex items-start gap-2">
                                  <img
                                    src={subComment.user.avatar}
                                    alt={subComment.user.nickname}
                                    className="w-6 h-6 rounded-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iI0Y3RjhGOSIvPjxwYXRoIGQ9Ik0xMiAxNkMxMy42NTY5IDE2IDE1IDE3LjM0MzEgMTUgMTlIOUM5IDE3LjM0MzEgMTAuMzQzMSAxNiAxMiAxNloiIGZpbGw9IiM5Q0EzQUYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjkiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz48L3N2Zz4=';
                                    }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-gray-800 text-sm">
                                        {subComment.user.nickname}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {subComment.createTime}
                                      </span>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-1">
                                      {subComment.content}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span>👍 {subComment.likeCount}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    显示第1页评论，每页最多10条
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
