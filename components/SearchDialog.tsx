"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import SearchForUser from "./search/SearchForUser"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SearchDialog = ({ open, onOpenChange }: SearchDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] p-0 bg-zinc-700/20 backdrop-blur-sm border-2 border-zinc-800 text-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <SearchForUser onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SearchDialog
