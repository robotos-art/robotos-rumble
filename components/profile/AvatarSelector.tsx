'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useRobotoTokensContext } from '../../contexts/RobotoTokensContext'
import { cn } from '../../lib/utils'

interface AvatarSelectorProps {
  open: boolean
  onClose: () => void
  currentAvatar?: { type: 'roboto' | 'robopet', tokenId: string } | null
  onSelect: (avatar: { type: 'roboto' | 'robopet', tokenId: string }) => void
}

export function AvatarSelector({ open, onClose, currentAvatar, onSelect }: AvatarSelectorProps) {
  const { robotos, robopets } = useRobotoTokensContext()
  const [selected, setSelected] = useState(currentAvatar)
  
  const handleSave = () => {
    if (selected) {
      onSelect(selected)
    }
    onClose()
  }

  const getImageUrl = (type: 'roboto' | 'robopet', tokenId: string, metadata?: any) => {
    if (type === 'roboto') {
      return `https://d2lp2vbc3umjmr.cloudfront.net/${tokenId}/roboto-transparent.png`
    }
    // For robopets, use the image from metadata
    return metadata?.image || ''
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-black/95 border-green-500">
        <DialogHeader>
          <DialogTitle className="text-green-400">Select Profile Picture</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={robotos.length > 0 ? "robotos" : "robopets"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="robotos" disabled={robotos.length === 0}>
              Robotos ({robotos.length})
            </TabsTrigger>
            <TabsTrigger value="robopets" disabled={robopets.length === 0}>
              Robopets ({robopets.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="robotos" className="mt-4">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {robotos.map((roboto) => (
                <button
                  key={roboto.tokenId}
                  onClick={() => setSelected({ type: 'roboto', tokenId: roboto.tokenId })}
                  className={cn(
                    "relative p-2 border-2 rounded-lg transition-all",
                    selected?.type === 'roboto' && selected?.tokenId === roboto.tokenId
                      ? "border-green-500 bg-green-500/20"
                      : "border-gray-700 hover:border-gray-500"
                  )}
                >
                  <img
                    src={getImageUrl('roboto', roboto.tokenId)}
                    alt={`Roboto #${roboto.tokenId}`}
                    className="w-full h-auto"
                  />
                  <p className="text-xs text-green-400 mt-1 truncate">Roboto #{roboto.tokenId}</p>
                </button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="robopets" className="mt-4">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {robopets.map((pet) => (
                <button
                  key={pet.tokenId}
                  onClick={() => setSelected({ type: 'robopet', tokenId: pet.tokenId })}
                  className={cn(
                    "relative p-2 border-2 rounded-lg transition-all",
                    selected?.type === 'robopet' && selected?.tokenId === pet.tokenId
                      ? "border-green-500 bg-green-500/20"
                      : "border-gray-700 hover:border-gray-500"
                  )}
                >
                  <img
                    src={getImageUrl('robopet', pet.tokenId, pet.metadata)}
                    alt={`Robopet #${pet.tokenId}`}
                    className="w-full h-auto"
                  />
                  <p className="text-xs text-green-400 mt-1 truncate">Robopet #{pet.tokenId}</p>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selected}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}