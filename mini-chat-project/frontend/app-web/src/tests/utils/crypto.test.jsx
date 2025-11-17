import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hashNicknameForRoom } from '../../utils/crypto'

describe('crypto utils', () => {
  describe('hashNicknameForRoom', () => {
    it('should generate a deterministic hash', async () => {
      const nickname = 'testuser'
      const roomId = 'room123'
      
      const hash1 = await hashNicknameForRoom(nickname, roomId)
      const hash2 = await hashNicknameForRoom(nickname, roomId)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(16)
    })

    it('should generate different hashes for different inputs', async () => {
      const hash1 = await hashNicknameForRoom('user1', 'room1')
      const hash2 = await hashNicknameForRoom('user2', 'room1')
      const hash3 = await hashNicknameForRoom('user1', 'room2')
      
      expect(hash1).not.toBe(hash2)
      expect(hash1).not.toBe(hash3)
      expect(hash2).not.toBe(hash3)
    })

    it('should return a 16 character hex string', async () => {
      const hash = await hashNicknameForRoom('testuser', 'room123')
      
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })

    it('should handle empty strings', async () => {
      const hash = await hashNicknameForRoom('', '')
      
      expect(hash).toHaveLength(16)
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })

    it('should handle special characters', async () => {
      const hash = await hashNicknameForRoom('user@#$%', 'room!@#')
      
      expect(hash).toHaveLength(16)
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })
  })
})
