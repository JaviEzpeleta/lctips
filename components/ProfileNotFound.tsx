"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { SearchIcon, HomeIcon } from "lucide-react"

interface ProfileNotFoundProps {
  handle: string
}

const ProfileNotFound = ({ handle }: ProfileNotFoundProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
            <SearchIcon className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-4"
        >
          Profile Not Found
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-300 mb-2"
        >
          We couldn't find a Lens profile for
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl font-semibold text-purple-400 mb-8 bg-gray-700 px-4 py-2 rounded-lg inline-block"
        >
          @{handle}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <p className="text-gray-400 text-sm mb-6">
            This handle might not exist on Lens Chain or could be misspelled.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              Go Home
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <SearchIcon className="w-4 h-4 mr-2" />
              Search Again
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default ProfileNotFound
