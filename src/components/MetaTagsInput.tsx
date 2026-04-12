import { Input, Tag } from 'antd'
import { useState } from 'react'

interface Props {
  value: string[]
  onChange: (v: string[]) => void
}

export default function MetaTagsInput({ value, onChange }: Props) {
  const [input, setInput] = useState('')

  const add = () => {
    const tag = input.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setInput('')
  }

  return (
    <div>
      <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {value.map((t) => (
          <Tag key={t} closable onClose={() => onChange(value.filter((x) => x !== t))}>
            {t}
          </Tag>
        ))}
      </div>
      <Input
        size="small"
        style={{ width: 200 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onPressEnter={add}
        onBlur={add}
        placeholder="Добавить тэг..."
      />
    </div>
  )
}
