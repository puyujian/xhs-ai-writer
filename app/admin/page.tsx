'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift, Copy, Check } from 'lucide-react'

interface GenerateResult {
  success: boolean;
  code?: string;
  message: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('')
  const [value, setValue] = useState(5)
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const handleGenerate = async () => {
    if (!adminKey.trim()) {
      setResult({ success: false, message: '请输入管理员密钥' });
      return;
    }

    if (value <= 0 || value > 100) {
      setResult({ success: false, message: '兑换码价值必须在 1-100 之间' });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value,
          adminKey,
          description: description || `${value}次使用兑换码`
        }),
      });

      const data: GenerateResult = await response.json();
      setResult(data);

      if (data.success) {
        console.log('🎫 生成兑换码成功:', data.code);
      }
    } catch (error) {
      console.error('生成兑换码失败:', error);
      setResult({ success: false, message: '生成失败，请重试' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (result?.code) {
      navigator.clipboard.writeText(result.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎫 兑换码管理</h1>
          <p className="text-gray-600">生成兑换码为用户提供额外的使用次数</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="text-blue-600" />
              生成新兑换码
            </CardTitle>
            <CardDescription>
              输入管理员密钥和兑换码价值，生成新的兑换码
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">管理员密钥</label>
              <Input
                type="password"
                placeholder="输入管理员密钥"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-1">
                需要在环境变量 ADMIN_KEY 中设置
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">兑换码价值（使用次数）</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-1">
                用户兑换后可以获得的额外使用次数 (1-100)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">备注说明（可选）</label>
              <Input
                placeholder="如：活动奖励、客服补偿等"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !adminKey.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  生成中...
                </div>
              ) : (
                `生成 ${value} 次使用兑换码`
              )}
            </Button>

            {result && (
              <div className={`p-4 rounded-md ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`font-medium mb-1 ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success ? '✅ 生成成功' : '❌ 生成失败'}
                </div>
                
                <div className={`text-sm ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message}
                </div>

                {result.success && result.code && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 p-3 bg-white border border-green-300 rounded-md">
                      <code className="flex-1 font-mono text-lg font-bold text-gray-900">
                        {result.code}
                      </code>
                      <Button
                        onClick={handleCopyCode}
                        variant="outline"
                        size="sm"
                        className="min-w-[80px]"
                      >
                        {copiedCode ? (
                          <div className="flex items-center gap-1">
                            <Check size={16} />
                            已复制
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Copy size={16} />
                            复制
                          </div>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      🎁 请将此兑换码分享给用户，可获得 {value} 次额外使用机会
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">使用说明</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 兑换码格式：XXXX-XXXX-XXXX，有效期30天</p>
              <p>• 每个兑换码只能使用一次</p>
              <p>• 用户可在主页面输入兑换码获取额外使用次数</p>
              <p>• 额外次数不会在每日重置时清零</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}