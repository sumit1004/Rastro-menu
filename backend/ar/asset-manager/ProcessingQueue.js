const EventEmitter = require('events');

class ProcessingQueue extends EventEmitter {
  constructor(concurrency = 2) {
    super();
    this.concurrency = concurrency;
    this.queue = [];
    this.activeCount = 0;
  }

  /**
   * Pushes a task into the queue and starts processing if below concurrency limit.
   */
  enqueue(taskFn, priority = 'NORMAL') {
    return new Promise((resolve, reject) => {
      const task = { taskFn, resolve, reject, priority };
      if (priority === 'HIGH') {
        this.queue.unshift(task); // High priority goes to front
      } else {
        this.queue.push(task);
      }
      this.processNext();
    });
  }

  async processNext() {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const task = this.queue.shift();

    try {
      const result = await task.taskFn();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }
}

// Singleton instance for the server
module.exports = new ProcessingQueue();
