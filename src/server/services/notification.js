/**
 * Notification Service
 * Handles notification creation, retrieval, and management
 */

import { randomUUID } from 'crypto'

const MAX_NOTIFICATIONS_PER_USER = 100

// In-memory storage (replace with database in production)
const notifications = new Map()

function getUserNotificationList(userId) {
  return notifications.get(userId) || []
}

/**
 * Create a new notification
 * @param {{
 *   userId: string
 *   title: string
 *   message?: string
 *   level: 'info' | 'warning' | 'error' | 'success'
 *   source?: 'system' | 'cron' | 'agent' | 'billing' | 'user'
 *   link?: string
 *   isPersistent: boolean
 * }} notification
 */
export function createNotification(notification) {
  const notif = {
    ...notification,
    id: randomUUID(),
    isRead: false,
    createdAt: Date.now()
  }

  const userNotifications = getUserNotificationList(notification.userId)
  if (userNotifications.length >= MAX_NOTIFICATIONS_PER_USER) {
    userNotifications.pop()
  }

  userNotifications.unshift(notif)
  notifications.set(notification.userId, userNotifications)
  return notif
}

/**
 * Get notifications for a user
 * @param {string} userId
 * @param {{
 *   page?: number
 *   limit?: number
 *   unreadOnly?: boolean
 *   level?: 'info' | 'warning' | 'error' | 'success'
 * }=} options
 */
export function getNotifications(userId, options = {}) {
  const userNotifications = getUserNotificationList(userId)

  let filtered = [...userNotifications]
  if (options.unreadOnly) {
    filtered = filtered.filter(notification => !notification.isRead)
  }
  if (options.level) {
    filtered = filtered.filter(notification => notification.level === options.level)
  }

  const unreadCount = userNotifications.filter(notification => !notification.isRead).length
  const page = options.page || 1
  const limit = options.limit || 50
  const start = (page - 1) * limit
  const end = start + limit

  return {
    items: filtered.slice(start, end),
    total: filtered.length,
    unreadCount
  }
}

/**
 * Mark notification as read
 * @param {string} userId
 * @param {string} notificationId
 */
export function markNotificationRead(userId, notificationId) {
  const userNotifications = notifications.get(userId)
  if (!userNotifications) {
    return false
  }

  const notification = userNotifications.find(item => item.id === notificationId)
  if (!notification || notification.userId !== userId) {
    return false
  }

  notification.isRead = true
  return true
}

/**
 * Mark all notifications as read
 * @param {string} userId
 */
export function markAllNotificationsRead(userId) {
  const userNotifications = notifications.get(userId)
  if (!userNotifications) {
    return 0
  }

  let count = 0
  for (const notification of userNotifications) {
    if (!notification.isRead) {
      notification.isRead = true
      count += 1
    }
  }

  return count
}

/**
 * Delete a notification
 * @param {string} userId
 * @param {string} notificationId
 */
export function deleteNotification(userId, notificationId) {
  const userNotifications = notifications.get(userId)
  if (!userNotifications) {
    return false
  }

  const index = userNotifications.findIndex(notification => notification.id === notificationId)
  if (index === -1) {
    return false
  }

  userNotifications.splice(index, 1)
  notifications.set(userId, userNotifications)
  return true
}

/**
 * Clear all notifications for a user
 * @param {string} userId
 */
export function clearAllNotifications(userId) {
  notifications.delete(userId)
}

/**
 * Clear read notifications for a user
 * @param {string} userId
 */
export function clearReadNotifications(userId) {
  const userNotifications = notifications.get(userId)
  if (!userNotifications) {
    return 0
  }

  const unread = userNotifications.filter(notification => !notification.isRead)
  notifications.set(userId, unread)
  return userNotifications.length - unread.length
}

/**
 * Helper methods for creating notifications
 */
export function info(userId, title, message, options = {}) {
  return createNotification({
    userId,
    title,
    message,
    level: 'info',
    source: options.source,
    link: options.link,
    isPersistent: options.persistent ?? false
  })
}

export function warning(userId, title, message, options = {}) {
  return createNotification({
    userId,
    title,
    message,
    level: 'warning',
    source: options.source,
    link: options.link,
    isPersistent: options.persistent ?? false
  })
}

export function error(userId, title, message, options = {}) {
  return createNotification({
    userId,
    title,
    message,
    level: 'error',
    source: options.source,
    link: options.link,
    isPersistent: options.persistent ?? false
  })
}

export function success(userId, title, message, options = {}) {
  return createNotification({
    userId,
    title,
    message,
    level: 'success',
    source: options.source,
    link: options.link,
    isPersistent: options.persistent ?? false
  })
}

/**
 * Test helper to clear in-memory state between specs.
 */
export function __resetNotificationsForTests() {
  notifications.clear()
}
