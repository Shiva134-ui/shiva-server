const ruleEngine = require('./ruleEngine');

class EventEngine {
  constructor() {
    this.listeners = new Map();
  }

  // Allow internal services to register for specific event types if needed
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  // Dispatch a metric update (e.g. from a background polling loop)
  dispatchMetric(category, metric, value, context = {}) {
    // Evaluate rules first
    ruleEngine.evaluateMetric(category, metric, value, context).catch(err => {
      console.error('[EventEngine] Rule evaluation error (metric):', err);
    });

    // Notify any internal listeners
    const listeners = this.listeners.get(`${category}:${metric}`);
    if (listeners) {
      listeners.forEach(cb => cb(value, context));
    }
  }

  // Dispatch a discrete event (e.g. power_restored, docker_container_crashed)
  dispatchEvent(category, event, context = {}) {
    // Evaluate rules first
    ruleEngine.evaluateEvent(category, event, context).catch(err => {
      console.error('[EventEngine] Rule evaluation error (event):', err);
    });

    // Notify any internal listeners
    const listeners = this.listeners.get(`${category}:${event}`);
    if (listeners) {
      listeners.forEach(cb => cb(context));
    }
  }
}

module.exports = new EventEngine();
