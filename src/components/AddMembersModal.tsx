import { useEffect, useState } from 'react'
import {
  Modal, Tabs, Select, Button, Upload, Input, Typography, Space, Tag, message,
} from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import type { MailGroup, User } from '../types'
import { mailGroupService } from '../services'

interface Props {
  open: boolean
  group: MailGroup
  onClose: () => void
  onAdded: (group: MailGroup) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseEmails(raw: string): string[] {
  return [...new Set(
    raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_RE.test(e)),
  )]
}

export default function AddMembersModal({ open, group, onClose, onAdded }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [extraEmails, setExtraEmails] = useState<string[]>([])
  const [extraInput, setExtraInput] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      mailGroupService.getUsers().then(setUsers)
      setPickedIds([])
      setExtraEmails([])
      setExtraInput('')
      setBulkText('')
    }
  }, [open])

  const candidates = users.filter((u) => !group.memberIds.includes(u.id))

  const addExtraEmail = () => {
    const email = extraInput.trim().toLowerCase()
    if (!email) return
    if (!EMAIL_RE.test(email)) {
      message.warning('Invalid email')
      return
    }
    if (!extraEmails.includes(email)) setExtraEmails([...extraEmails, email])
    setExtraInput('')
  }

  const handleFileRead = (file: File): false => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '')
      setBulkText((prev) => (prev ? `${prev}\n${text}` : text))
    }
    reader.readAsText(file)
    return false
  }

  const collectEmails = (): string[] => {
    const fromBulk = parseEmails(bulkText)
    return [...new Set([...extraEmails, ...fromBulk])]
  }

  const handleOk = async () => {
    setSaving(true)
    try {
      const emails = collectEmails()
      const userIds = [...pickedIds]
      for (const email of emails) {
        const results = await mailGroupService.searchUsers(email)
        const user = results[0]
        if (user && !userIds.includes(user.id)) userIds.push(user.id)
      }
      if (userIds.length === 0) {
        message.warning('No members to add')
        setSaving(false)
        return
      }
      const updated = await mailGroupService.addMembers(group.id, userIds)
      message.success(`Added ${userIds.length} member${userIds.length > 1 ? 's' : ''}`)
      onAdded(updated)
      onClose()
    } catch {
      message.error('Failed to add members')
    } finally {
      setSaving(false)
    }
  }

  const items = [
    {
      key: 'individual',
      label: 'Individually',
      children: (
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Pick from existing users
          </Typography.Text>
          <Select
            mode="multiple"
            placeholder="Search by name or email"
            style={{ width: '100%', marginBottom: 16 }}
            value={pickedIds}
            onChange={setPickedIds}
            optionFilterProp="label"
            options={candidates.map((u) => ({
              label: `${u.displayName} — ${u.mail}`,
              value: u.id,
            }))}
          />

          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Or add by email
          </Typography.Text>
          <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
            <Input
              placeholder="user@company.com"
              value={extraInput}
              onChange={(e) => setExtraInput(e.target.value)}
              onPressEnter={addExtraEmail}
            />
            <Button onClick={addExtraEmail}>Add</Button>
          </Space.Compact>
          {extraEmails.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {extraEmails.map((e) => (
                <Tag
                  key={e}
                  closable
                  onClose={() => setExtraEmails(extraEmails.filter((x) => x !== e))}
                >
                  {e}
                </Tag>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'upload',
      label: 'Upload list',
      children: (
        <div>
          <Upload.Dragger
            multiple={false}
            accept=".csv,.txt"
            showUploadList={false}
            beforeUpload={handleFileRead as unknown as (f: UploadFile) => false}
            style={{ marginBottom: 12 }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Click or drag a .csv / .txt file</p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>
              One email per line, or comma/semicolon-separated
            </p>
          </Upload.Dragger>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
            Or paste a list here
          </Typography.Text>
          <Input.TextArea
            rows={6}
            placeholder={'alice@company.com\nbob@company.com'}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          {bulkText && (
            <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
              {parseEmails(bulkText).length} valid email(s) parsed
            </Typography.Text>
          )}
        </div>
      ),
    },
  ]

  return (
    <Modal
      title="Add members"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Add"
      confirmLoading={saving}
      destroyOnHidden
      width={560}
    >
      <Tabs items={items} />
    </Modal>
  )
}
