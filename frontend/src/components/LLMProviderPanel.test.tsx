import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LLMProvider } from '../types/enums'
import LLMProviderPanel from './LLMProviderPanel'
import type { LLMConfig } from '../types'

// Mock the API module to avoid real network calls
vi.mock('../services/api', () => ({
  testLLMConnection: vi.fn(),
}))

// Mock fetch for the /api/config/defaults call
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve({}),
  }))
})

const defaultConfig: LLMConfig = {
  provider: LLMProvider.NONE,
}

describe('LLMProvider enum', () => {
  it('should have DEEPSEEK = "deepseek"', () => {
    expect(LLMProvider.DEEPSEEK).toBe('deepseek')
  })
})

describe('LLMProviderPanel - DeepSeek provider', () => {
  it('renders DeepSeek option in the provider dropdown', () => {
    render(<LLMProviderPanel config={defaultConfig} onChange={() => {}} />)
    const select = screen.getByRole('combobox')
    const options = Array.from(select.querySelectorAll('option'))
    const deepseekOption = options.find(o => o.value === 'deepseek')
    expect(deepseekOption).toBeDefined()
    expect(deepseekOption?.textContent).toBe('DeepSeek')
  })

  it('shows API key and model fields when DeepSeek is selected', () => {
    const config: LLMConfig = { provider: LLMProvider.DEEPSEEK }
    render(<LLMProviderPanel config={config} onChange={() => {}} />)
    // Use getByPlaceholderText to find the API key input specifically
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument()
    expect(screen.getByLabelText(/^model$/i)).toBeInTheDocument()
  })

  it('model input has placeholder "deepseek-chat" when DeepSeek is selected', () => {
    const config: LLMConfig = { provider: LLMProvider.DEEPSEEK }
    render(<LLMProviderPanel config={config} onChange={() => {}} />)
    const modelInput = screen.getByLabelText(/model/i)
    expect(modelInput).toHaveAttribute('placeholder', 'deepseek-chat')
  })

  it('does not show base_url field for DeepSeek', () => {
    const config: LLMConfig = { provider: LLMProvider.DEEPSEEK }
    render(<LLMProviderPanel config={config} onChange={() => {}} />)
    expect(screen.queryByLabelText(/base url/i)).not.toBeInTheDocument()
  })

  it('calls onChange with deepseek-chat model default when DeepSeek is selected', () => {
    const handleChange = vi.fn()
    render(<LLMProviderPanel config={defaultConfig} onChange={handleChange} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'deepseek' } })
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: LLMProvider.DEEPSEEK,
        model: 'deepseek-chat',
      })
    )
  })
})
