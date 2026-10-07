import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import ContentPage from './ContentPage';
import { aboutApi } from '../services/aboutApi';

const OfficialSealPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sealUrl = "http://talibon.gov.ph/wp-content/uploads/2025/09/Talibon-Official-Seal-v4-2003-to-2023-.png";

  return (
    <ContentPage title="Official Seal" fetchData={aboutApi.getSeal} renderContent={(data) => <div className="bg-white pb-24 flex flex-col items-center relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">

        <div className="flex flex-col items-center justify-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring", damping: 20 }}
            className="relative w-full max-w-sm flex items-center justify-center"
          >
            <img 
              src={sealUrl} 
              alt="Official Seal of Talibon" 
              className="w-full h-auto max-w-[240px] sm:max-w-[280px] mx-auto drop-shadow-md"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          <div className="max-w-xl text-center">
            <p className="text-xs sm:text-sm text-brand-muted font-medium leading-relaxed">
              {data.description}
            </p>
          </div>
        </div>
      </div>
    </div>} />
  );
};

export default OfficialSealPage;
