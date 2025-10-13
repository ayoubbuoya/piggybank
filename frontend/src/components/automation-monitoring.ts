/**
 * Automation Monitoring Components
 * 
 * This file exports all automation monitoring components and types
 * for easy importing throughout the application.
 */

// Components
export { default as AutomationStatusCard } from './AutomationStatusCard';
export { default as ExecutionHistoryTable } from './ExecutionHistoryTable';

// Types from AutomationStatusCard
export type {
    AutomationStatusData,
    AutomationConfig,
} from './AutomationStatusCard';

// Types from ExecutionHistoryTable
export type {
    ExecutionRecord,
} from './ExecutionHistoryTable';

// Hooks
export { useAutomationStatus } from '../hooks/useAutomationStatus';
export { useExecutionHistory, parseEventToExecution } from '../hooks/useExecutionHistory';

/**
 * Usage Example:
 * 
 * import {
 *   AutomationStatusCard,
 *   ExecutionHistoryTable,
 *   useAutomationStatus,
 *   useExecutionHistory,
 *   type AutomationStatusData,
 *   type ExecutionRecord,
 * } from './components/automation-monitoring';
 */
