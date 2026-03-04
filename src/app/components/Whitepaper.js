'use client';

import { motion } from 'framer-motion';

export default function Whitepaper() {
  return (
    <section className="py-24 bg-[#1A0F0A]" id="whitepaper">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]">Whitepaper</h2>
          <div className="w-24 h-1 bg-[#D4A017] mx-auto rounded-full mb-8"></div>
          
          <p className="text-xl text-[#E8D5B5] mb-12">
            Explore the technical details, tokenomics model, and vision of Coffy Coin in our comprehensive whitepaper.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              href="/whitepaper/coffy-whitepaper.pdf"
              target="_blank"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-4 px-8 rounded-xl text-lg transition duration-300 shadow-lg hover:shadow-[#D4A017]/50 flex items-center justify-center group"
            >
              <i className="fas fa-file-pdf mr-2"></i>
              <span>View Whitepaper</span>
              <i className="fas fa-external-link-alt ml-2 group-hover:translate-x-1 transition-transform"></i>
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}