import { useState, useEffect } from "react";
import Logo from "../../../assets/image_1751568207796.png";
import { keys } from "../../../src/config";
import getDeviceId from "../../hooks/getDeviceId";

interface Issue {
  id: string;
  title: string;
  isActive: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
}

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [issuesList, setIssuesList] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // const deviceId=getDeviceId();

  const fetchIssuesList = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${keys?.base_url}api/rvm/RVM-3103/issues/list`
      );
      const data = await response.json();
      setIssuesList(data?.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) fetchIssuesList();
  }, [isOpen]);

  const handleReportIssue = async (id: string) => {
    try {
      setSubmittingId(id);
      setSelectedIssue(id);

      const response = await fetch(
        `${keys?.base_url}/api/rvm/RVM-3103/issues/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ issueTypeId: id }),
        }
      );

      const data = await response.json();

      if (data?.success) {
        setIsOpen(false);
        setSuccessMessage(data?.message || "Issue reported successfully");

        setTimeout(() => {
          setSuccessMessage(null);
        }, 2500);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <>
      <header className="bg-[#162a39] py-6 px-12 flex items-center justify-end">
        <div className="w-1/2 flex items-center justify-between">
          <img
            src="https://2374de0cfadcd9e0873215900598bd47.cdn.bubble.io/cdn-cgi/image/w=192,h=107,f=auto,dpr=2,fit=contain/f1760490037698x830374727604809700/box_%E9%80%8F%E9%81%8E.png"
            className="h-full w-36"
          />

          <button
            className="bg-[#14b8a6] px-4 py-2 rounded-full text-white"
            onClick={() => {
              setIsOpen(true);
              setSelectedIssue(null);
            }}
          >
            不具合通報
          </button>
        </div>
      </header>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Background */}
          <div className="absolute inset-0 backdrop-blur-md" />

          {/* Content */}
          <div className="relative w-full max-w-md px-5 bg-transparent py-6 z-50 flex flex-col text-[#14b8a6]">
            {/* Issues */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {loading ? (
                <p className="text-white/80">Loading...</p>
              ) : issuesList.length === 0 ? (
                <p className="text-white/80">No issues found</p>
              ) : (
                issuesList?.map((issue) => {
                  const isSelected = selectedIssue === issue.id;
                  const isSubmitting = submittingId === issue.id;

                  return (
                    <button
                      key={issue.id}
                      onClick={() => handleReportIssue(issue.id)}
                      disabled={!!submittingId}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200
                        ${
                          isSelected
                            ? "bg-[#14b8a6] text-white shadow-lg"
                            : "bg-[#14b8a6] text-white"
                        }
                        ${submittingId ? "opacity-70 cursor-not-allowed" : ""}
                      `}
                    >
                      <span className="font-medium">{issue.title}</span>

                      {isSubmitting ? (
                        <span>...</span>
                      ) : isSelected ? (
                        <span>✔</span>
                      ) : (
                        <span className="opacity-60">›</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Close */}
            <button
              className="absolute right-1 text-[#14b8a6] text-lg"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ✅ Success Message */}
      {successMessage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#14b8a6] text-white px-6 py-4 rounded-xl shadow-lg text-center">
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
