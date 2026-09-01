import React from "react";

interface HomeServiceNoticeModalProps {
  open: boolean;
  onCancel: () => void;
  onUnderstand: () => void;
}

/**
 * HomeServiceNoticeModal
 * Displays an informational modal when a customer selects "At Home" / Home Service during booking.
 * Informs customers that service providers may attach additional charges for traveling to their location.
 */
export const HomeServiceNoticeModal: React.FC<HomeServiceNoticeModalProps> = ({
  open,
  onCancel,
  onUnderstand,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-5 animate-fade-in"
      style={{ background: "rgba(13, 22, 38, 0.65)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[360px] sm:max-w-[380px] rounded-[28px] bg-white p-6 text-center shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Graphic Illustration */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#EBF4FF]">
          <div className="relative flex items-center justify-center">
            <svg
              viewBox="0 0 64 64"
              className="h-12 w-12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Home Icon Circle */}
              <circle cx="28" cy="24" r="14" fill="#3B82F6" />
              <path
                d="M28 17L21 23V30C21 30.5523 21.4477 31 22 31H25V27H31V31H34C34.5523 31 35 30.5523 35 30V23L28 17Z"
                fill="white"
              />

              {/* Dashed Path Line */}
              <path
                d="M36 34C40 37 42 41 46 38"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />

              {/* Location Pin */}
              <path
                d="M48 30C45.2386 30 43 32.2386 43 35C43 38.75 48 44 48 44C48 44 53 38.75 53 35C53 32.2386 50.7614 30 48 30Z"
                fill="#3B82F6"
              />
              <circle cx="48" cy="35" r="2.5" fill="white" />

              {/* Yellow Warning Triangle */}
              <path
                d="M20 38L29 52H11L20 38Z"
                fill="#F59E0B"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M20 43V47"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="20" cy="49.5" r="1" fill="white" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-center text-lg font-bold text-slate-900 mb-2">
          Home Service Notice
        </h3>

        {/* Messaging */}
        <p className="text-center text-xs sm:text-sm text-slate-600 leading-relaxed mb-3">
          You selected “At Home”. Please note that the service provider can attach any additional charge they see fit for coming to your location.
        </p>
        <p className="text-center text-xs sm:text-sm text-slate-500 leading-relaxed mb-6 font-medium">
          This charge is not included in the price listed for the service.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onUnderstand}
            className="flex-1 rounded-2xl bg-[#3B92F6] py-3 text-center text-sm font-semibold text-white shadow-md transition-all hover:bg-[#2563EB] active:scale-[0.98]"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeServiceNoticeModal;
