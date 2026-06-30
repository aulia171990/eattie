'use client'

import { useState } from 'react'
import { CustomCakeForm } from './custom-cake-form'
import { Sparkles } from 'lucide-react'

export function CustomCakeButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border-2 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={{
          borderColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary))',
          background: 'hsl(var(--primary-subtle))',
        }}>
        <Sparkles size={15} />
        Pesan Custom Cake
      </button>

      {/* Modal Backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(30,20,10,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative"
            onClick={e => e.stopPropagation()}>
            <CustomCakeForm onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
