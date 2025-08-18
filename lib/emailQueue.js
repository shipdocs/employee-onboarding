/**
 * Email Queue and Retry System
 * Manages email sending with retry logic and rate limiting
 */

const { supabase } = require('./supabase');

class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds initial delay
    this.rateLimitDelay = 1000; // 1 second between emails
  }

  /**
   * Add email to queue
   * @param {Object} emailData - Email data including to, subject, html, etc.
   * @param {Object} options - Options including priority, maxRetries
   * @returns {Promise<string>} Queue ID
   */
  async enqueue(emailData, options = {}) {
    const queueItem = {
      id: this.generateQueueId(),
      emailData,
      priority: options.priority || 'normal',
      maxRetries: options.maxRetries || this.maxRetries,
      attempts: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      lastAttemptAt: null,
      error: null
    };

    // Store in database if available
    try {
      await supabase
        .from('email_queue')
        .insert({
          id: queueItem.id,
          email_data: emailData,
          priority: queueItem.priority,
          status: queueItem.status,
          attempts: queueItem.attempts,
          created_at: queueItem.createdAt
        });
    } catch (error) {
      
    }

    // Add to in-memory queue
    this.queue.push(queueItem);
    
    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Process queued emails
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      
      try {
        // Update status
        item.status = 'processing';
        item.lastAttemptAt = new Date().toISOString();
        item.attempts++;

        // Send email using the provided send function
        const { unifiedEmailService } = require('./unifiedEmailService');
        const result = await unifiedEmailService.factory.sendEmail(item.emailData);

        // Mark as sent
        item.status = 'sent';
        item.sentAt = new Date().toISOString();
        item.messageId = result.messageId;

        // Update database status
        await this.updateQueueItemStatus(item);

        // Rate limiting
        await this.delay(this.rateLimitDelay);

      } catch (error) {
        // console.error(`❌ Email send failed (attempt ${item.attempts}/${item.maxRetries}):`, error);
        item.error = error.message;

        if (item.attempts < item.maxRetries) {
          // Calculate exponential backoff
          const retryDelay = this.retryDelay * Math.pow(2, item.attempts - 1);
          item.status = 'retry';
          item.nextRetryAt = new Date(Date.now() + retryDelay).toISOString();

          // Re-add to queue for retry
          setTimeout(() => {
            this.queue.push(item);
            if (!this.processing) {
              this.processQueue();
            }
          }, retryDelay);

        } else {
          // Max retries reached
          item.status = 'failed';
          // console.error(`💀 Email permanently failed after ${item.maxRetries} attempts: ${item.id}`);
        }

        // Update database status
        await this.updateQueueItemStatus(item);
      }
    }

    this.processing = false;
  }

  /**
   * Update queue item status in database
   * @param {Object} item - Queue item
   */
  async updateQueueItemStatus(item) {
    try {
      const updateData = {
        status: item.status,
        attempts: item.attempts,
        last_attempt_at: item.lastAttemptAt,
        error: item.error,
        updated_at: new Date().toISOString()
      };

      if (item.status === 'sent') {
        updateData.sent_at = item.sentAt;
        updateData.message_id = item.messageId;
      }

      if (item.nextRetryAt) {
        updateData.next_retry_at = item.nextRetryAt;
      }

      await supabase
        .from('email_queue')
        .update(updateData)
        .eq('id', item.id);

    } catch (error) {
      // Database update failed, but email processing continues
      
    }
  }

  /**
   * Get queue status
   * @returns {Object} Queue status information
   */
  getStatus() {
    const statusCounts = this.queue.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    return {
      queueLength: this.queue.length,
      processing: this.processing,
      statusCounts,
      oldestItem: this.queue.length > 0 ? this.queue[0].createdAt : null
    };
  }

  /**
   * Clear failed emails from queue
   * @returns {number} Number of items cleared
   */
  clearFailed() {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.status !== 'failed');
    return initialLength - this.queue.length;
  }

  /**
   * Retry failed emails
   * @returns {number} Number of items retried
   */
  retryFailed() {
    let retriedCount = 0;
    
    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.attempts = 0;
        item.error = null;
        retriedCount++;
      }
    });

    if (retriedCount > 0 && !this.processing) {
      this.processQueue();
    }

    return retriedCount;
  }

  /**
   * Generate unique queue ID
   * @returns {string} Queue ID
   */
  generateQueueId() {
    return `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process queued emails from database on startup
   */
  async loadPendingFromDatabase() {
    try {
      const { data: pendingEmails } = await supabase
        .from('email_queue')
        .select('*')
        .in('status', ['pending', 'retry', 'processing'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });

      if (pendingEmails && pendingEmails.length > 0) {

        pendingEmails.forEach(dbItem => {
          const queueItem = {
            id: dbItem.id,
            emailData: dbItem.email_data,
            priority: dbItem.priority,
            maxRetries: dbItem.max_retries || this.maxRetries,
            attempts: dbItem.attempts || 0,
            status: dbItem.status,
            createdAt: dbItem.created_at,
            lastAttemptAt: dbItem.last_attempt_at,
            error: dbItem.error
          };
          
          this.queue.push(queueItem);
        });

        // Start processing
        if (!this.processing) {
          this.processQueue();
        }
      }
    } catch (error) {
      
    }
  }
}

// Export singleton instance
const emailQueue = new EmailQueue();

// Load pending emails on startup
emailQueue.loadPendingFromDatabase();

module.exports = { emailQueue, EmailQueue };