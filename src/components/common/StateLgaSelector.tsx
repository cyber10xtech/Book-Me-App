import React, { useState } from "react";
import { ChevronDown, MapPin, Building } from "lucide-react";
import { getStates, getLgasForState, normalizeStateName } from "../../data/nigeriaLocations";
import SearchableSelectModal from "./SearchableSelectModal";

interface StateLgaSelectorProps {
  stateValue: string;
  lgaValue: string;
  onStateChange: (state: string) => void;
  onLgaChange: (lga: string) => void;
  stateLabel?: string;
  lgaLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const StateLgaSelector: React.FC<StateLgaSelectorProps> = ({
  stateValue,
  lgaValue,
  onStateChange,
  onLgaChange,
  stateLabel = "State",
  lgaLabel = "City / LGA",
  required = false,
  disabled = false,
  className = "space-y-4",
}) => {
  const [openStateModal, setOpenStateModal] = useState(false);
  const [openLgaModal, setOpenLgaModal] = useState(false);

  const normalizedState = normalizeStateName(stateValue);
  const statesList = getStates();
  const lgasList = getLgasForState(normalizedState);

  const handleSelectState = (newState: string) => {
    if (newState !== stateValue) {
      onStateChange(newState);
      onLgaChange(""); // Reset LGA when state changes
    }
  };

  const handleSelectLga = (newLga: string) => {
    onLgaChange(newLga);
  };

  return (
    <div className={className}>
      {/* State Field */}
      <div>
        <label className="text-xs font-bold text-primary uppercase tracking-wide mb-1 flex items-center justify-between">
          <span>
            {stateLabel} {required && <span className="text-destructive">*</span>}
          </span>
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
              {normalizedState || "Select State"}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      {/* LGA Field */}
      <div>
        <label className="text-xs font-bold text-primary uppercase tracking-wide mb-1 flex items-center justify-between">
          <span>
            {lgaLabel} {required && <span className="text-destructive">*</span>}
          </span>
        </label>
        <button
          type="button"
          disabled={disabled || !normalizedState}
          onClick={() => setOpenLgaModal(true)}
          className="w-full h-12 px-4 rounded-2xl bg-muted text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className={lgaValue ? "text-foreground font-medium text-sm truncate" : "text-muted-foreground text-sm truncate"}>
              {!normalizedState
                ? "Select a State first"
                : lgaValue || `Select ${normalizedState === "Federal Capital Territory (FCT)" ? "Area Council" : "LGA"}`}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      {/* State Selector Modal */}
      <SearchableSelectModal
        open={openStateModal}
        onClose={() => setOpenStateModal(false)}
        title="Select State / FCT"
        options={statesList}
        selectedValue={normalizedState}
        onSelect={handleSelectState}
        placeholder="Search state name..."
      />

      {/* LGA Selector Modal */}
      <SearchableSelectModal
        open={openLgaModal}
        onClose={() => setOpenLgaModal(false)}
        title={`Select ${normalizedState === "Federal Capital Territory (FCT)" ? "Area Council" : "LGA"} (${normalizedState})`}
        options={lgasList}
        selectedValue={lgaValue}
        onSelect={handleSelectLga}
        placeholder={`Search ${normalizedState === "Federal Capital Territory (FCT)" ? "Area Council" : "LGA"}...`}
      />
    </div>
  );
};

export default StateLgaSelector;
