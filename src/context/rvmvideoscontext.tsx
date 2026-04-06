import { createContext, useContext, useState } from "react";

interface VideosType {
  deviceId: string;
  waitingScreenVideo: string;
  footerMedia: string;
  completionScreenVideo: string;
}

interface RVMVideosContextType {
  videos: VideosType | null;
  handleAddVideos: (data: VideosType) => void;
}

export const RVMVideosContext = createContext<RVMVideosContextType | undefined>(
  undefined
);

export const RVMVideosContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [videos, setVideos] = useState<VideosType | null>(null);

  const handleAddVideos = (data: VideosType) => {
    setVideos(data);
  };

  return (
    <RVMVideosContext.Provider value={{ videos, handleAddVideos }}>
      {children}
    </RVMVideosContext.Provider>
  );
};

export const useRVMVideos = () => {
  const context = useContext(RVMVideosContext);
  if (!context) {
    throw new Error("useRVMVideos must be used within RVMVideosContextProvider");
  }
  return context;
};