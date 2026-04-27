import { useState } from 'react'
import {
  Typography, Button, Card, Form, Input, Select, Switch,
  Space, message, Radio,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { CreateGroupInput } from '../types'
import { mailGroupService } from '../services'
import { useCurrentUser } from '../context/CurrentUserContext'
import MetaTagsInput from '../components/MetaTagsInput'

const BUSINESS_LINES = ['SME', 'Car Loan', 'Retail', 'Marketing', 'IT', 'Legal', 'Finance', 'HR']

export default function GroupCreate() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nickname = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 64)
    form.setFieldValue('mailNickname', nickname)
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    setLoading(true)
    try {
      const input: CreateGroupInput = {
        displayName: values.displayName as string,
        mailNickname: values.mailNickname as string,
        description: values.description as string | undefined,
        businessLine: values.businessLine as string | undefined,
        tags,
        type: values.type as 'regular' | 'dynamic',
        visibility: values.visibility as 'Public' | 'Private',
        hideFromAddressLists: values.hideFromAddressLists as boolean,
      }
      const group = await mailGroupService.createGroup(input, currentUser.id)
      message.success(`Group "${group.displayName}" created — ${group.mail}`)
      navigate(`/groups/${group.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')}>Back</Button>
        <Typography.Title level={3} style={{ margin: 0 }}>Create group</Typography.Title>
      </Space>

      <Card style={{ borderRadius: 12 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'regular', visibility: 'Public', hideFromAddressLists: false }}
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Group name"
            name="displayName"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input
              placeholder="Project Finance 214-FZ"
              onChange={handleNameChange}
            />
          </Form.Item>

          <Form.Item
            label="Group address"
            name="mailNickname"
            rules={[
              { required: true, message: 'Please enter an address' },
              { pattern: /^[a-z0-9-]+$/, message: 'Only latin letters, digits and dashes' },
            ]}
            extra={
              <span style={{ color: '#888', fontSize: 12 }}>
                @company.com — address will be registered in Microsoft
              </span>
            }
          >
            <Input placeholder="pf-214-fz" addonAfter="@company.com" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Short group description" />
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

          <Form.Item label="Group type" name="type">
            <Radio.Group>
              <Radio value="regular">Regular</Radio>
              <Radio value="dynamic">Dynamic (rule-based membership)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="Visibility" name="visibility">
            <Radio.Group>
              <Radio value="Public">Public — visible to everyone</Radio>
              <Radio value="Private">Private — invitation only</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Hide from Microsoft global address list"
            name="hideFromAddressLists"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" loading={loading}>
              Create group
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
