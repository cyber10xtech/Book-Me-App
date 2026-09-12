import React, { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { getStates, normalizeStateName } from "../../data/nigeriaLocations";
import SearchableSelectModal from "./SearchableSelectModal";

interface StateSelectorProps {
  stateValue: string;
  onStateChange: (state: string) => void;
  stateLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const StateSelector: React.FC<StateSelectorProps> = ({
  stateValue,
  onStateChange,
  stateLabel = "State",
  required = false,
  disabled = false,
  className = "space-y-4",
  placeholder = "All States",
}) => {
  const [openStateModal, setOpenStateModal] = useState(false);

  const normalizedState = normalizeStateName(stateValue);
  const statesList = getStates();

  const handleSelectState = (newState: string) => {
    if (newState !== stateValue) {
      onStateChange(newState);
    }
  };

  return (
    <div className={className}>
      <div>
        <label className="text-xs font-bold text-primary uppercase tracking-wide mb-1 flex items-center justify-between">
          <span>
            {stateLabel} {required && <span className="text-destructive">*</span>}
          </span>
          {normalizedState && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onStateChange(""); }}
              className="text-xs text-primary underline"
            >
              Clear
            </button>
          )}
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpenStateModal(true)}
          className="w-full h-12 px-4 rounded-2xl bg-muted text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className={normalizedState ? "text-foreground font-medium text-sm truncate" : "text-muted-foreground text-sm truncate"}>
              {normalizedState || placeholder}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      <SearchableSelectModal
        open={openStateModal}
        onClose={() => setOpenStateModal(false)}
        title="Select State / FCT"
        options={statesList}
        selectedValue={normalizedState}
        onSelect={handleSelectState}
        placeholder="Search state name..."
      />
    </div>
  );
};

export default StateSelector;
