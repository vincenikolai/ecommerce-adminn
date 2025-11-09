'use client';

import { CgSpinner } from "react-icons/cg";

const Loader = () => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <CgSpinner className="animate-spin h-6 w-6 text-primary" />
    </div>
  );
};

export { Loader };
