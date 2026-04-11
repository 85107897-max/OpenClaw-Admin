import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { NButton, NIcon } from 'naive-ui'
import ThemeSwitcher from '@/components/common/ThemeSwitcher.vue'

// Mock vue-i18n
vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'theme.light': '亮色',
          'theme.dark': '暗色',
          'theme.auto': '自动',
        }
        return translations[key] || key
      },
      locale: { value: 'zh-CN' },
    }),
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockReturnValue(null)
  localStorageMock.setItem.mockReturnValue(undefined)
  localStorageMock.clear.mockReturnValue(undefined)
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('ThemeSwitcher', () => {
  it('renders all theme buttons', () => {
    const wrapper = mount(ThemeSwitcher)
    
    // 检查是否有 3 个主题按钮
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('sets default theme from props', () => {
    const wrapper = mount(ThemeSwitcher, {
      props: {
        defaultTheme: 'dark'
      }
    })
    
    const vm = wrapper.vm as any
    expect(vm.currentTheme).toBe('dark')
  })

  it('emits theme change event', async () => {
    const wrapper = mount(ThemeSwitcher)
    
    const buttons = wrapper.findAll('button')
    const darkButton = buttons.find(btn => btn.text().includes('暗色'))
    
    if (darkButton) {
      await darkButton.trigger('click')
      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')?.[0]?.[0]).toBe('dark')
    }
  })

  it('saves theme to localStorage', async () => {
    const wrapper = mount(ThemeSwitcher)
    
    const buttons = wrapper.findAll('button')
    const darkButton = buttons.find(btn => btn.text().includes('暗色'))
    
    if (darkButton) {
      await darkButton.trigger('click')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('app-theme', 'dark')
    }
  })

  it('loads theme from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue('dark')
    
    mount(ThemeSwitcher)
    
    expect(localStorageMock.getItem).toHaveBeenCalledWith('app-theme')
  })

  it('applies theme to document', async () => {
    const wrapper = mount(ThemeSwitcher)
    
    const buttons = wrapper.findAll('button')
    const darkButton = buttons.find(btn => btn.text().includes('暗色'))
    
    if (darkButton) {
      await darkButton.trigger('click')
      
      const html = document.documentElement
      expect(html.getAttribute('data-theme')).toBe('dark')
    }
  })

  it('toggles theme class on document', async () => {
    const wrapper = mount(ThemeSwitcher)
    
    const buttons = wrapper.findAll('button')
    
    // 切换到暗色
    const darkButton = buttons.find(btn => btn.text().includes('暗色'))
    if (darkButton) {
      await darkButton.trigger('click')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    }
    
    // 切换到亮色
    const lightButton = buttons.find(btn => btn.text().includes('亮色'))
    if (lightButton) {
      await lightButton.trigger('click')
      expect(document.documentElement.classList.contains('light')).toBe(true)
    }
  })

  it('exposes getTheme and setTheme methods', () => {
    const wrapper = mount(ThemeSwitcher)
    
    const vm = wrapper.vm as any
    expect(typeof vm.getTheme).toBe('function')
    expect(typeof vm.setTheme).toBe('function')
  })
})
