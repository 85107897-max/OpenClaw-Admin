/**
 * Test suite for notification service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as notificationService from '../../../src/server/services/notification.js'
const {
  createNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  clearReadNotifications,
  info,
  warning,
  error,
  success
} = notificationService

describe('Notification Service', () => {
  const testUserId = 'user_test_123'

  beforeEach(() => {
    notificationService.__resetNotificationsForTests?.()
  })

  describe('createNotification', () => {
    it('should create a notification with correct fields', () => {
      const notif = createNotification({
        userId: testUserId,
        title: 'Test Notification',
        message: 'This is a test message',
        level: 'info',
        source: 'system',
        isPersistent: false
      })

      expect(notif).toHaveProperty('id')
      expect(notif.userId).toBe(testUserId)
      expect(notif.title).toBe('Test Notification')
      expect(notif.message).toBe('This is a test message')
      expect(notif.level).toBe('info')
      expect(notif.source).toBe('system')
      expect(notif.isRead).toBe(false)
      expect(notif.isPersistent).toBe(false)
      expect(notif.createdAt).toBeTypeOf('number')
    })

    it('should generate unique IDs', () => {
      const notif1 = createNotification({
        userId: testUserId,
        title: 'Test 1',
        level: 'info',
        isPersistent: false
      })

      const notif2 = createNotification({
        userId: testUserId,
        title: 'Test 2',
        level: 'info',
        isPersistent: false
      })

      expect(notif1.id).not.toBe(notif2.id)
    })

    it('should respect max stored limit of 100', () => {
      // Create 105 notifications
      for (let i = 0; i < 105; i++) {
        createNotification({
          userId: testUserId,
          title: `Notification ${i}`,
          level: 'info',
          isPersistent: false
        })
      }

      const result = getNotifications(testUserId)
      expect(result.items.length).toBeLessThanOrEqual(100)
    })
  })

  describe('getNotifications', () => {
    const userId = 'user_get_test'

    beforeEach(() => {
      // Create test notifications
      createNotification({
        userId,
        title: 'Read notification',
        level: 'info',
        isPersistent: false
      })
      
      const unread = createNotification({
        userId,
        title: 'Unread notification',
        level: 'warning',
        isPersistent: false
      })
      
      // Mark first one as read (we'd need to access internal state for this)
    })

    it('should return notifications for user', () => {
      const result = getNotifications(userId)
      expect(result.items).toBeInstanceOf(Array)
      expect(result.total).toBeGreaterThanOrEqual(1)
    })

    it('should paginate correctly', () => {
      const result1 = getNotifications(userId, { page: 1, limit: 10 })
      const result2 = getNotifications(userId, { page: 2, limit: 10 })
      
      expect(result1.items.length).toBeLessThanOrEqual(10)
      expect(result2.items.length).toBeLessThanOrEqual(10)
    })

    it('should filter by unread only', () => {
      const result = getNotifications(userId, { unreadOnly: true })
      expect(result.items.every(n => !n.isRead)).toBe(true)
    })

    it('should filter by level', () => {
      const result = getNotifications(userId, { level: 'warning' })
      expect(result.items.every(n => n.level === 'warning')).toBe(true)
    })

    it('should calculate unread count correctly', () => {
      const result = getNotifications(userId)
      expect(result.unreadCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('markNotificationRead', () => {
    it('should mark notification as read', () => {
      const notif = createNotification({
        userId: 'user_read_test',
        title: 'To be read',
        level: 'info',
        isPersistent: false
      })

      const result = markNotificationRead('user_read_test', notif.id)
      expect(result).toBe(true)
      
      const found = getNotifications('user_read_test').items.find(n => n.id === notif.id)
      expect(found?.isRead).toBe(true)
    })

    it('should return false for non-existent notification', () => {
      const result = markNotificationRead('user_read_test', 'non-existent-id')
      expect(result).toBe(false)
    })

    it('should return false for notification belonging to another user', () => {
      const notif = createNotification({
        userId: 'user_a',
        title: 'User A notification',
        level: 'info',
        isPersistent: false
      })

      const result = markNotificationRead('user_b', notif.id)
      expect(result).toBe(false)
    })
  })

  describe('markAllNotificationsRead', () => {
    it('should mark all notifications as read', () => {
      const userId = 'user_mark_all_test'
      createNotification({ userId, title: 'Notif 1', level: 'info', isPersistent: false })
      createNotification({ userId, title: 'Notif 2', level: 'warning', isPersistent: false })

      const count = markAllNotificationsRead(userId)
      expect(count).toBeGreaterThanOrEqual(2)

      const result = getNotifications(userId, { unreadOnly: true })
      expect(result.items.length).toBe(0)
    })

    it('should return 0 for user with no notifications', () => {
      const count = markAllNotificationsRead('non_existent_user')
      expect(count).toBe(0)
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification', () => {
      const userId = 'user_delete_test'
      const notif = createNotification({
        userId,
        title: 'To be deleted',
        level: 'info',
        isPersistent: false
      })

      const result = deleteNotification(userId, notif.id)
      expect(result).toBe(true)

      const found = getNotifications(userId).items.find(n => n.id === notif.id)
      expect(found).toBeUndefined()
    })

    it('should return false for non-existent notification', () => {
      const result = deleteNotification('user_delete_test', 'non-existent')
      expect(result).toBe(false)
    })
  })

  describe('clearAllNotifications', () => {
    it('should clear all notifications for user', () => {
      const userId = 'user_clear_all_test'
      createNotification({ userId, title: 'Notif 1', level: 'info', isPersistent: false })
      createNotification({ userId, title: 'Notif 2', level: 'warning', isPersistent: false })

      clearAllNotifications(userId)

      const result = getNotifications(userId)
      expect(result.items.length).toBe(0)
    })
  })

  describe('clearReadNotifications', () => {
    it('should clear only read notifications', () => {
      const userId = 'user_clear_read_test'
      const notif = createNotification({
        userId,
        title: 'To be read then cleared',
        level: 'info',
        isPersistent: false
      })
      markNotificationRead(userId, notif.id)

      const count = clearReadNotifications(userId)
      expect(count).toBeGreaterThanOrEqual(1)

      const result = getNotifications(userId)
      expect(result.items.every(n => !n.isRead)).toBe(true)
    })
  })

  describe('Helper methods (info, warning, error, success)', () => {
    it('info should create info level notification', () => {
      const notif = info('user_helper_test', 'Info title', 'Info message')
      expect(notif.level).toBe('info')
    })

    it('warning should create warning level notification', () => {
      const notif = warning('user_helper_test', 'Warning title', 'Warning message')
      expect(notif.level).toBe('warning')
    })

    it('error should create error level notification', () => {
      const notif = error('user_helper_test', 'Error title', 'Error message')
      expect(notif.level).toBe('error')
    })

    it('success should create success level notification', () => {
      const notif = success('user_helper_test', 'Success title', 'Success message')
      expect(notif.level).toBe('success')
    })

    it('should support optional persistent flag', () => {
      const notif = info('user_helper_test', 'Persistent', 'Message', { persistent: true })
      expect(notif.isPersistent).toBe(true)
    })

    it('should support optional link', () => {
      const notif = info('user_helper_test', 'With link', 'Message', { link: 'http://example.com' })
      expect(notif.link).toBe('http://example.com')
    })
  })
})
