import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'

export default function VariantAttributeManager({ attributes, onUpdate, errors = {} }) {
  const [nextId, setNextId] = useState(0)

  const addAttribute = () => {
    const newAttr = {
      id: `attr_${nextId}`,
      name: '',
      required: true,
      input_type: 'select',
    }
    setNextId((prev) => prev + 1)
    onUpdate([...attributes, newAttr])
  }

  const updateAttribute = (index, field, value) => {
    const next = [...attributes]
    next[index] = { ...next[index], [field]: value }
    onUpdate(next)
  }

  const removeAttribute = (index) => {
    onUpdate(attributes.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Variation attributes</h3>
      <p className="text-xs text-gray-400">Define what attributes vary (e.g., size, color, material)</p>

      {attributes.length === 0 && (
        <p className="text-sm text-gray-400 py-2">No attributes added yet.</p>
      )}

      <div className="space-y-2">
        {attributes.map((attr, idx) => (
          <div key={attr.id} className="flex items-end gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {/* Attribute name */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={attr.name}
                onChange={(e) => updateAttribute(idx, 'name', e.target.value)}
                placeholder="Size, Color, Material…"
                className="input text-sm"
              />
            </div>

            {/* Input type */}
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={attr.input_type}
                onChange={(e) => updateAttribute(idx, 'input_type', e.target.value)}
                className="input text-sm"
              >
                <option value="select">Select / Dropdown</option>
                <option value="text">Text Input</option>
              </select>
            </div>

            {/* Required toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attr.required}
                  onChange={(e) => updateAttribute(idx, 'required', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs font-medium text-gray-600">Required</span>
              </label>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeAttribute(idx)}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addAttribute}
        className="btn-secondary text-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        Add attribute
      </button>

      {errors.variant_attributes && (
        <p className="text-xs text-red-500">{errors.variant_attributes}</p>
      )}
    </div>
  )
}
