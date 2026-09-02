import React, { useState, useEffect } from "react";
import { Search, X, Check, MapPin } from "lucide-react";

interface SearchableSelectModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
}

export const SearchableSelectModal: React.FC<SearchableSelectModalProps> = ({
  open,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  placeholder = "Search location...",
}) => {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setSearch("");
    }
  }, [open]);

  if (!open) return null;

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden transition-all duration-200">
        
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-base font-extrabold text-foreground">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-border bg-muted/40">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border/30">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = selectedValue?.toLowerCase() === opt.toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl flex items-center justify-between text-left transition-colors text-sm font-medium ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground hover:bg-secondary active:bg-secondary/80"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm font-semibold">No location found</p>
              <p className="text-xs mt-1 text-muted-foreground/80">Try checking your spelling</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchableSelectModal;
