import React, { useState } from "react";
import type { Goal, DailyLog } from "@/shared/types";
import {
  Calendar,
  Target,
  Edit3,
  Trash2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { format } from "date-fns";

interface GoalCardProps {
  goal: Goal;
  dailyLog?: DailyLog;
  onToggleComplete?: (
    goalId: number,
    completed: boolean,
    notes?: string,
  ) => void;
  onEditGoal?: (goal: Goal) => void;
  onDeleteGoal?: (goalId: number) => void;
  showActions?: boolean;
  compact?: boolean;
}

export default function GoalCard({
  goal,
  dailyLog,
  onToggleComplete,
  onEditGoal,
  onDeleteGoal,
  showActions = true,
  compact = false,
}: GoalCardProps): React.ReactElement {
  const [notes, setNotes] = useState(dailyLog?.notes ?? "");
  const [showNotesInput, setShowNotesInput] = useState(false);

  const isCompleted = dailyLog?.is_completed ?? false;

  const handleToggleComplete = (): void => {
    if (onToggleComplete) {
      onToggleComplete(goal.id, !isCompleted, notes);
    }
  };

  const handleSaveNotes = (): void => {
    if (onToggleComplete) {
      onToggleComplete(goal.id, isCompleted, notes);
    }
    setShowNotesInput(false);
  };

  const frequencyColors = {
    daily: "bg-green-100 text-green-800 border-green-200",
    weekly: "bg-blue-100 text-blue-800 border-blue-200",
    monthly: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const frequencyColor =
    frequencyColors[goal.target_frequency as keyof typeof frequencyColors];

  return (
    <div
      className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-200 ${compact ? "p-4" : "p-6"}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <button
              onClick={handleToggleComplete}
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isCompleted
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-white/40 hover:border-green-400 text-transparent hover:text-green-400"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>

            <div className="flex-1">
              <h3
                className={`font-semibold text-white ${isCompleted ? "line-through opacity-75" : ""}`}
              >
                {goal.title}
              </h3>
              {goal.description && !compact && (
                <p className="text-sm text-purple-100 mt-1">
                  {goal.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 mb-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${frequencyColor}`}
            >
              <Calendar className="w-3 h-3 mr-1" />
              {goal.target_frequency}
            </span>

            {goal.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                <Target className="w-3 h-3 mr-1" />
                {goal.category}
              </span>
            )}
          </div>

          {/* Notes Section */}
          {!compact && (
            <div className="space-y-2">
              {showNotesInput ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                    }}
                    placeholder="Add notes about today's progress..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveNotes}
                      className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-md transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowNotesInput(false);
                        setNotes(dailyLog?.notes ?? "");
                      }}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {notes ? (
                    <p className="text-sm text-purple-100 bg-white/5 rounded-lg p-2 border border-white/10">
                      {notes}
                    </p>
                  ) : null}
                  <button
                    onClick={() => {
                      setShowNotesInput(true);
                    }}
                    className="text-xs text-purple-200 hover:text-white transition-colors"
                  >
                    {notes ? "Edit notes" : "Add notes"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && !compact && (
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => { onEditGoal?.(goal); }}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { onDeleteGoal?.(goal.id); }}
              className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {!compact && (
        <div className="mt-4 text-xs text-white/40">
          Created {format(new Date(goal.created_at), "MMM dd, yyyy")}
        </div>
      )}
    </div>
  );
}
