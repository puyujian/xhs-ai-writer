'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatErrorForUser } from '@/lib/error-handler'
import { FormData, ErrorState } from '@/lib/types'

// Constants
const UI_CONFIG = {
  title: 'AI 智能文案工厂',
  version: 'v2.0',
  description: '基于先进AI模型 · 实时智能分析 · 一键生成爆款内容',
  placeholders: {
    keyword: '例如：护肤心得、美食探店、旅行攻略...',
    userInfo: '产品特点、个人感受、具体细节...越详细生成的文案越精准👍'
  },
  buttonText: '开始生成爆款文案'
} as const;

// UI Components
function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-blue-200/15 to-indigo-200/15 rounded-full blur-3xl animate-float" style={{animationDelay: '0s'}}></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-indigo-200/15 to-purple-200/15 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-gradient-to-r from-slate-200/10 to-blue-200/10 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
    </div>
  );
}

function StatusBadges() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200/50">
        {UI_CONFIG.version}
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200/50">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
        <span className="text-xs text-green-700 font-semibold">ONLINE</span>
      </div>
    </div>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  icon: string;
  required?: boolean;
  type: 'input' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function FormField({ id, label, icon, required = false, type, value, onChange, placeholder }: FormFieldProps) {
  const baseClassName = "border-2 border-gray-200/80 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-base shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white/80 backdrop-blur-sm text-gray-700 placeholder:text-gray-400 font-medium";
  
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="text-sm sm:text-base font-semibold text-gray-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white shadow-md">
          {icon}
        </div>
        <span className="flex-1">{label}</span>
        {required && (
          <div className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-full">REQUIRED</div>
        )}
      </label>
      {type === 'input' ? (
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClassName} h-14`}
        />
      ) : (
        <Textarea
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClassName} min-h-[160px] resize-none leading-relaxed`}
          rows={6}
        />
      )}
    </div>
  );
}

interface ErrorDisplayProps {
  error: ErrorState;
  onRetry: () => void;
}

function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="bg-red-50 border border-red-200 p-4 rounded-md">
      <div className="flex items-start gap-3">
        <div className="text-red-500 text-lg">⚠️</div>
        <div className="flex-1">
          <div className="font-medium text-red-800 mb-1">{error.title}</div>
          <div className="text-red-700 text-sm mb-2">{error.message}</div>
          <div className="text-red-600 text-xs mb-3">{error.suggestion}</div>

          <div className="flex items-center gap-2">
            {error.canRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                重试
              </Button>
            )}
            <span className="text-xs text-red-500">错误ID: {error.errorId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom hooks
function useFormValidation(formData: FormData) {
  const isValid = formData.keyword.trim() && formData.userInfo.trim();
  
  const validateAndGetError = (): ErrorState | null => {
    if (!isValid) {
      return formatErrorForUser('请填写关键词和原始资料');
    }
    return null;
  };
  
  return { isValid, validateAndGetError };
}

export default function GeneratorClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    keyword: '',
    userInfo: ''
  });
  const [error, setError] = useState<ErrorState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { isValid, validateAndGetError } = useFormValidation(formData);

  const updateFormField = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  const handleGenerate = () => {
    const validationError = validateAndGetError();
    if (validationError) {
      setError(validationError);
      return;
    }

    // 立即显示加载状态
    setIsGenerating(true);

    // 立即跳转，不需要任何等待
    const params = new URLSearchParams({
      keyword: formData.keyword.trim(),
      userInfo: formData.userInfo.trim()
    });
    
    router.push(`/generate?${params.toString()}`);
  };

  const handleRetry = () => {
    setError(null);
    handleGenerate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      <BackgroundDecorations />
      
      <div className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          <Card className="glass-card animate-fade-in shadow-xl hover:shadow-2xl overflow-hidden bg-gradient-to-br from-white/95 via-blue-50/80 to-indigo-50/90 backdrop-blur-lg border border-blue-100/50 relative transition-all duration-500">
            {/* Header decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
            
            {/* Background texture */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
                backgroundSize: '24px 24px'
              }}></div>
            </div>
            
            <CardHeader className="pb-4 px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-gray-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent font-bold leading-tight mb-3">
                    {UI_CONFIG.title}
                  </div>
                  <StatusBadges />
                </div>
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-gray-600 mt-4 font-medium text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  {UI_CONFIG.description}
                </div>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8 relative z-10">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <FormField
                  id="topic"
                  label="文案主题"
                  icon="🎯"
                  required
                  type="input"
                  value={formData.keyword}
                  onChange={updateFormField('keyword')}
                  placeholder={UI_CONFIG.placeholders.keyword}
                />
                
                <div className="xl:row-span-2">
                  <FormField
                    id="material"
                    label="素材内容"
                    icon="📝"
                    required
                    type="textarea"
                    value={formData.userInfo}
                    onChange={updateFormField('userInfo')}
                    placeholder={UI_CONFIG.placeholders.userInfo}
                  />
                </div>
              </div>

              {error && <ErrorDisplay error={error} onRetry={handleRetry} />}

              <div className="flex justify-center pt-6">
                <Button 
                  onClick={handleGenerate}
                  disabled={!isValid || isGenerating}
                  className="px-12 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-500 w-full sm:w-auto max-w-sm group relative overflow-hidden bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-400 hover:via-indigo-500 hover:to-purple-500 text-white border-0 rounded-2xl transform hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      {isGenerating ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <span className="text-xl group-hover:scale-110 transition-transform duration-300">⚡</span>
                      )}
                    </div>
                    <span>{isGenerating ? '正在进入生成页面...' : UI_CONFIG.buttonText}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}