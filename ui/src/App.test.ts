import { test, expect } from 'vitest'
import { sum, greet } from './utils'

test('sum adds two numbers', () => {
  expect(sum(1, 2)).toBe(3)
  expect(sum(-1, 1)).toBe(0)
})

test('greet returns a greeting string', () => {
  expect(greet('Alice')).toBe('Hello, Alice!')
})
