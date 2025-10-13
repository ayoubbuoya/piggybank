import { useState } from "react";

export interface ExecutionRecord {
  id: string;
  timestamp: number; // Unix timestamp in seconds
  type: "DCA" | "DEPOSIT" | "STRATEGY";
  status: "SUCCESS" | "ERROR" | "RETRY";
  amount?: string;
  details?: string;
  errorMessage?: string;
  transactionHash?: string;
}

interface ExecutionHistoryTableProps {
  executions: ExecutionRecord[];
  maxRows?: number;
}

export default function ExecutionHistoryTable({
  executions,
  maxRows = 10,
}: ExecutionHistoryTableProps) {
  const [showAll, setShowAll] = useState(false);

  // Sort executions by timestamp (most recent first)
  const sortedExecutions = [...executions].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  // Limit displayed rows
  const displayedExecutions = showAll
    ? sortedExecutions
    : sortedExecutions.slice(0, maxRows);

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatTimestamp(timestamp);
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "DCA":
        return (
          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-semibold">
            💰 DCA
          </span>
        );
      case "DEPOSIT":
        return (
          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-semibold">
            📅 Deposit
          </span>
        );
      case "STRATEGY":
        return (
          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-semibold">
            🎯 Strategy
          </span>
        );
      default:
        return (
          <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-semibold">
            {type}
          </span>
        );
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-block bg-lime-200 text-lime-900 text-xs px-2 py-1 rounded font-semibold">
            ✓ Success
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-block bg-red-200 text-red-900 text-xs px-2 py-1 rounded font-semibold">
            ✗ Error
          </span>
        );
      case "RETRY":
        return (
          <span className="inline-block bg-yellow-200 text-yellow-900 text-xs px-2 py-1 rounded font-semibold">
            ↻ Retry
          </span>
        );
      default:
        return (
          <span className="inline-block bg-gray-200 text-gray-900 text-xs px-2 py-1 rounded font-semibold">
            {status}
          </span>
        );
    }
  };

  if (executions.length === 0) {
    return (
      <div className="brut-card bg-gray-50 p-6">
        <h3 className="font-bold text-lg mb-2">📊 Execution History</h3>
        <p className="text-gray-600">
          No executions yet. Automation will appear here once it starts running.
        </p>
      </div>
    );
  }

  return (
    <div className="brut-card bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">📊 Execution History</h3>
        <span className="text-sm text-gray-600">
          {executions.length} total execution
          {executions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-ink-950">
              <th className="text-left py-3 px-2 font-bold text-sm">Time</th>
              <th className="text-left py-3 px-2 font-bold text-sm">Type</th>
              <th className="text-left py-3 px-2 font-bold text-sm">Status</th>
              <th className="text-left py-3 px-2 font-bold text-sm">Amount</th>
              <th className="text-left py-3 px-2 font-bold text-sm">Details</th>
            </tr>
          </thead>
          <tbody>
            {displayedExecutions.map((execution) => (
              <tr
                key={execution.id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="py-3 px-2 text-sm">
                  <div>
                    <p className="font-semibold">
                      {formatRelativeTime(execution.timestamp)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(execution.timestamp)}
                    </p>
                  </div>
                </td>
                <td className="py-3 px-2">{getTypeBadge(execution.type)}</td>
                <td className="py-3 px-2">
                  {getStatusBadge(execution.status)}
                </td>
                <td className="py-3 px-2 text-sm font-semibold">
                  {execution.amount || "-"}
                </td>
                <td className="py-3 px-2 text-sm">
                  {execution.status === "ERROR" && execution.errorMessage ? (
                    <span className="text-red-600">
                      {execution.errorMessage}
                    </span>
                  ) : execution.details ? (
                    <span className="text-gray-600">{execution.details}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                  {execution.transactionHash && (
                    <a
                      href={`https://buildnet.massa.net/tx/${execution.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 hover:underline mt-1"
                    >
                      View transaction →
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {displayedExecutions.map((execution) => (
          <div
            key={execution.id}
            className="border-2 border-ink-950 rounded-lg p-3 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-2">
              {getTypeBadge(execution.type)}
              {getStatusBadge(execution.status)}
            </div>

            <div className="space-y-1 text-sm">
              <p className="text-gray-600">
                <span className="font-semibold">Time:</span>{" "}
                {formatRelativeTime(execution.timestamp)}
              </p>

              {execution.amount && (
                <p className="text-gray-600">
                  <span className="font-semibold">Amount:</span>{" "}
                  {execution.amount}
                </p>
              )}

              {execution.status === "ERROR" && execution.errorMessage && (
                <p className="text-red-600">
                  <span className="font-semibold">Error:</span>{" "}
                  {execution.errorMessage}
                </p>
              )}

              {execution.details && execution.status !== "ERROR" && (
                <p className="text-gray-600">
                  <span className="font-semibold">Details:</span>{" "}
                  {execution.details}
                </p>
              )}

              {execution.transactionHash && (
                <a
                  href={`https://buildnet.massa.net/tx/${execution.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View transaction →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {executions.length > maxRows && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="brut-btn bg-blue-200 text-sm"
          >
            {showAll
              ? "Show Less"
              : `Show All (${executions.length - maxRows} more)`}
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t-2 border-gray-200 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-lime-600">
            {executions.filter((e) => e.status === "SUCCESS").length}
          </p>
          <p className="text-xs text-gray-600">Successful</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">
            {executions.filter((e) => e.status === "ERROR").length}
          </p>
          <p className="text-xs text-gray-600">Errors</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {executions.filter((e) => e.status === "RETRY").length}
          </p>
          <p className="text-xs text-gray-600">Retries</p>
        </div>
      </div>
    </div>
  );
}
