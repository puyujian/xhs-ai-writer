import { type ClassValue } from "clsx"
import { cn } from "@/lib/utils"

/**
 * 统一设计系统 - Design System
 * 为整个应用提供一致的视觉规范
 */

// ===================
// 颜色系统 (Color System)
// ===================
export const colors = {
  // 主色调 - 基于品牌粉红色
  primary: {
    50: 'rgb(254 242 242)',   // 最浅粉色背景
    100: 'rgb(254 226 226)',  // 浅粉色背景
    200: 'rgb(254 202 202)',  // 中浅粉色
    300: 'rgb(252 165 165)',  // 中等粉色
    400: 'rgb(248 113 113)',  // 中深粉色
    500: 'rgb(239 68 68)',    // 标准红色
    600: 'rgb(220 38 38)',    // 深红色
    700: 'rgb(185 28 28)',    // 更深红色
    800: 'rgb(153 27 27)',    // 深棕红
    900: 'rgb(127 29 29)',    // 最深红色
  },
  
  // 辅助色调 - 蓝色系
  secondary: {
    50: 'rgb(239 246 255)',   
    100: 'rgb(219 234 254)',  
    200: 'rgb(191 219 254)',  
    300: 'rgb(147 197 253)',  
    400: 'rgb(96 165 250)',   
    500: 'rgb(59 130 246)',   
    600: 'rgb(37 99 235)',    
    700: 'rgb(29 78 216)',    
    800: 'rgb(30 64 175)',    
    900: 'rgb(30 58 138)',    
  },
  
  // 中性色系
  neutral: {
    0: 'rgb(255 255 255)',    // 纯白
    50: 'rgb(249 250 251)',   // 极浅灰
    100: 'rgb(243 244 246)',  // 浅灰背景
    200: 'rgb(229 231 235)',  // 边框色
    300: 'rgb(209 213 219)',  // 分割线
    400: 'rgb(156 163 175)',  // 占位文字
    500: 'rgb(107 114 128)',  // 次要文字
    600: 'rgb(75 85 99)',     // 主要文字
    700: 'rgb(55 65 81)',     // 深色文字
    800: 'rgb(31 41 55)',     // 标题文字
    900: 'rgb(17 24 39)',     // 最深文字
  },
  
  // 状态色系
  success: {
    50: 'rgb(240 253 244)',
    100: 'rgb(220 252 231)', 
    500: 'rgb(34 197 94)',
    600: 'rgb(22 163 74)',
  },
  
  warning: {
    50: 'rgb(255 251 235)',
    100: 'rgb(254 243 199)',
    500: 'rgb(245 158 11)', 
    600: 'rgb(217 119 6)',
  },
  
  error: {
    50: 'rgb(254 242 242)',
    100: 'rgb(254 226 226)',
    500: 'rgb(239 68 68)',
    600: 'rgb(220 38 38)',
  },
} as const

// ===================
// 间距系统 (Spacing System)
// ===================
export const spacing = {
  // 基础间距单位 (4px = 1 unit)
  px: '1px',
  0: '0',
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
} as const

// ===================
// 字体系统 (Typography System)
// ===================
export const typography = {
  // 字体大小
  size: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
  },
  
  // 字体权重
  weight: {
    normal: '400',
    medium: '500', 
    semibold: '600',
    bold: '700',
  },
  
  // 行高
  leading: {
    tight: '1.25',
    normal: '1.5', 
    relaxed: '1.625',
    loose: '2',
  },
} as const

// ===================
// 阴影系统 (Shadow System)
// ===================
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  
  // 特殊阴影 - 带颜色
  colored: {
    primary: '0 4px 14px 0 rgb(239 68 68 / 0.15)',
    secondary: '0 4px 14px 0 rgb(59 130 246 / 0.15)',
  },
} as const

// ===================
// 圆角系统 (Border Radius System)
// ===================
export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  base: '0.25rem',   // 4px  
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  full: '9999px',
} as const

// ===================
// 组件样式预设 (Component Presets)
// ===================
export const presets = {
  // 卡片预设
  card: {
    base: 'bg-white rounded-lg border border-neutral-200 shadow-sm',
    hover: 'transition-all duration-200 hover:shadow-md hover:border-neutral-300',
    focus: 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-opacity-20',
  },
  
  // 按钮预设
  button: {
    base: 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizes: {
      sm: 'h-8 px-3 text-sm',
      base: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
    variants: {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm',
      secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 shadow-sm',
      outline: 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500',
      ghost: 'text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-500',
    },
  },
  
  // 输入框预设
  input: {
    base: 'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors duration-200',
    error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
  },
  
  // 渐变预设
  gradient: {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600',
    secondary: 'bg-gradient-to-r from-secondary-500 to-secondary-600',
    brand: 'bg-gradient-to-r from-primary-500 to-secondary-500',
    subtle: 'bg-gradient-to-br from-primary-50 via-white to-secondary-50',
  },
} as const

// ===================
// 响应式断点 (Responsive Breakpoints)
// ===================
export const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// ===================
// 布局预设 (Layout Presets)
// ===================
export const layout = {
  // 容器预设
  container: {
    base: 'w-full mx-auto px-4 sm:px-6',
    sizes: {
      sm: 'max-w-2xl',
      md: 'max-w-4xl', 
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-none',
    },
  },
  
  // 网格预设
  grid: {
    responsive: 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3',
    sidebar: 'grid grid-cols-1 gap-6 lg:grid-cols-4',
  },
  
  // 间距预设
  section: {
    py: 'py-12 md:py-16 lg:py-20',
    px: 'px-4 sm:px-6 lg:px-8',
  },
} as const

// ===================
// 动画预设 (Animation Presets) 
// ===================
export const animations = {
  transition: {
    base: 'transition-all duration-200 ease-in-out',
    fast: 'transition-all duration-150 ease-in-out', 
    slow: 'transition-all duration-300 ease-in-out',
  },
  
  // 常用动画组合
  hover: {
    scale: 'hover:scale-105 transition-transform duration-200',
    lift: 'hover:-translate-y-1 hover:shadow-md transition-all duration-200',
    glow: 'hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200',
  },
} as const

// ===================
// 工具函数 (Utility Functions)
// ===================

/**
 * 创建统一的类名组合
 */
export function createClassName(...inputs: ClassValue[]) {
  return cn(...inputs)
}

/**
 * 获取响应式间距
 */
export function getResponsiveSpacing(mobile: keyof typeof spacing, desktop?: keyof typeof spacing) {
  const mobileClass = `p-${mobile}`
  const desktopClass = desktop ? `lg:p-${desktop}` : ''
  return cn(mobileClass, desktopClass)
}

/**
 * 获取文本样式组合
 */
export function getTextStyles(
  size: keyof typeof typography.size, 
  weight?: keyof typeof typography.weight,
  color?: string
) {
  const sizeClass = `text-${size}`
  const weightClass = weight ? `font-${weight}` : ''
  const colorClass = color || ''
  return cn(sizeClass, weightClass, colorClass)
}

/**
 * 获取渐变文字效果
 */
export function getGradientText(gradient: keyof typeof presets.gradient = 'brand') {
  return cn(
    presets.gradient[gradient],
    'bg-clip-text text-transparent font-semibold'
  )
}

// 导出所有设计系统组件
export const ds = {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  presets,
  breakpoints,
  layout,
  animations,
  // 工具函数
  cn: createClassName,
  getResponsiveSpacing,
  getTextStyles,
  getGradientText,
} as const

export default ds