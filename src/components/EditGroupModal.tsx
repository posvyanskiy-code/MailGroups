import { useEffect, useState } from 'react'
import { Modal, Form, Input, Select, Radio, Switch, message } from 'antd'
import type { MailGroup } from '../types'
import { mailGroupService } from '../services'
import MetaTagsInput from './MetaTagsInput'

const BUSINESS_LINES = ['SME', 'Car Loan', 'Retail', 'Marketing', 'IT', 'Legal', 'Finance', 'HR']

interface Props {
  open: boolean
  group: MailGroup
  onClose: () => void
  onSaved: (group: MailGroup) => void
}

export default function EditGroupModal({ open, group, onClose, onSaved }: Props) {
  const [form] = Form.useForm()
  const [tags, setTags] = useState<string[]>(group.tags)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        displayName: group.displayName,
        description: group.description,
        businessLine: group.businessLine,
        visibility: group.visibility,
        hideFromAddressLists: group.hideFromAddressLists,
      })
      setTags(group.tags)
    }
  }, [open, group, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const updated = await mailGroupService.updateGroup(group.id, {
        displayName: values.displayName,
        description: values.description,
        businessLine: values.businessLine,
        tags,
        visibility: values.visibility,
        hideFromAddressLists: values.hideFromAddressLists,
      })
      message.success('Group updated')
      onSaved(updated)
      onClose()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Edit group"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Save"
      confirmLoading={saving}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="Group name"
          name="displayName"
          rules={[{ required: true, message: 'Please enter a name' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item label="Business line" name="businessLine">
          <Select
            placeholder="Select a business line"
            allowClear
            options={BUSINESS_LINES.map((bl) => ({ label: bl, value: bl }))}
          />
        </Form.Item>

        <Form.Item label="Tags">
          <MetaTagsInput value={tags} onChange={setTags} />
        </Form.Item>

        <Form.Item label="Visibility" name="visibility" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="Public">Public — visible in search, anyone can request to join</Radio>
            <Radio value="Private">Private — invisible to non-members, owners add manually</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Hide from Microsoft global address list"
          name="hideFromAddressLists"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
