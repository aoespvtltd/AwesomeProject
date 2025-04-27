import React from 'react'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogFooter  } from './ui/dialog'

function DialogBox({isDialogOpen, setIsDialogOpen}) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogTitle>Item Limit Reached</DialogTitle>
          <DialogDescription>Items quantity cannot exceed 5.</DialogDescription>
          <DialogFooter>
            <button
              onClick={() => setIsDialogOpen(false)}
              className="px-4 py-2 bg-orange-400 text-white rounded-md"
            >
              Okay
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}

export default DialogBox