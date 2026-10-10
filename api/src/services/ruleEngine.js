const Store = require('../utils/store');
const notificationEngine = require('./notificationEngine');

const rulesStore = new Store('notificationRules.json', { rules: [] });
const stateStore = new Store('notificationState.json', { lastTriggered: {} });

class RuleEngine {
  async getRules() {
    const data = await rulesStore.read();
    return data.rules;
  }

  async saveRules(rules) {
    await rulesStore.write({ rules });
  }

  async evaluateMetric(category, metric, value, context = {}) {
    try {
      const rules = await this.getRules();
      const activeRules = rules.filter(r => r.enabled && r.category === category && r.metric === metric);
      
      if (activeRules.length === 0) return;

      const stateData = await stateStore.read();
      const now = Date.now();
      let stateChanged = false;

      if (!stateData.activeConditionStarts) stateData.activeConditionStarts = {};

      for (const rule of activeRules) {
        let isTriggered = false;

        // Evaluate operator
        if (rule.operator === '>') isTriggered = value > rule.threshold;
        else if (rule.operator === '<') isTriggered = value < rule.threshold;
        else if (rule.operator === '>=') isTriggered = value >= rule.threshold;
        else if (rule.operator === '<=') isTriggered = value <= rule.threshold;
        else if (rule.operator === '==') isTriggered = value == rule.threshold;
        else if (rule.operator === '!=') isTriggered = value != rule.threshold;

        const ruleId = rule.id;

        if (isTriggered) {
          if (!stateData.activeConditionStarts[ruleId]) {
            stateData.activeConditionStarts[ruleId] = now;
            stateChanged = true;
          }

          const durationMs = (rule.duration || 0) * 60 * 1000;
          const conditionTime = now - stateData.activeConditionStarts[ruleId];

          if (conditionTime >= durationMs) {
            const lastTrigger = stateData.lastTriggered[ruleId] || 0;
            const cooldownMs = (rule.cooldown || 30) * 60 * 1000;

            if (now - lastTrigger > cooldownMs) {
              // Trigger notification
              let body = `Alert: ${metric} is ${value} (Threshold: ${rule.operator} ${rule.threshold})`;
              if (rule.duration) body += ` for ${rule.duration} minutes`;
              if (context.details) body += `\n${context.details}`;

              await notificationEngine.sendNotification({
                title: rule.name || `${category.toUpperCase()} Alert`,
                body,
                severity: rule.severity || 'warning',
                category,
                event: metric
              });

              stateData.lastTriggered[ruleId] = now;
              stateChanged = true;
            }
          }
        } else {
          // Condition no longer met, reset duration tracking
          if (stateData.activeConditionStarts[ruleId]) {
            delete stateData.activeConditionStarts[ruleId];
            stateChanged = true;
          }
        }
      }

      if (stateChanged) {
        await stateStore.write(stateData);
      }
    } catch (err) {
      console.error('[RuleEngine] Error evaluating metric:', err);
    }
  }

  async evaluateEvent(category, event, context = {}) {
    try {
      const rules = await this.getRules();
      const activeRules = rules.filter(r => r.enabled && r.category === category && r.event === event);
      
      if (activeRules.length === 0) return;

      const stateData = await stateStore.read();
      const now = Date.now();
      let stateChanged = false;

      for (const rule of activeRules) {
        const ruleId = rule.id;
        const lastTrigger = stateData.lastTriggered[ruleId] || 0;
        const cooldownMs = (rule.cooldown || 5) * 60 * 1000; // default 5 mins for events

        if (now - lastTrigger > cooldownMs) {
          const body = context.message || `Event triggered: ${event}`;
          
          await notificationEngine.sendNotification({
            title: rule.title || `${category.toUpperCase()} Event`,
            body,
            severity: rule.severity || 'info',
            category,
            event
          });

          stateData.lastTriggered[ruleId] = now;
          stateChanged = true;
        }
      }

      if (stateChanged) {
        await stateStore.write(stateData);
      }
    } catch (err) {
      console.error('[RuleEngine] Error evaluating event:', err);
    }
  }
}

module.exports = new RuleEngine();
