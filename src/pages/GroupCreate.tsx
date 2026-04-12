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
      message.success(`Рассылка «${group.displayName}» создана — ${group.mail}`)
      navigate(`/groups/${group.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')}>Назад</Button>
        <Typography.Title level={3} style={{ margin: 0 }}>Создать рассылку</Typography.Title>
      </Space>

      <Card style={{ borderRadius: 12 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'regular', visibility: 'Public', hideFromAddressLists: false }}
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Название рассылки"
            name="displayName"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input
              placeholder="Проектное финансирование 214-ФЗ"
              onChange={handleNameChange}
            />
          </Form.Item>

          <Form.Item
            label="Адрес рассылки"
            name="mailNickname"
            rules={[
              { required: true, message: 'Укажите адрес' },
              { pattern: /^[a-z0-9-]+$/, message: 'Только латинские буквы, цифры и дефис' },
            ]}
            extra={
              <span style={{ color: '#888', fontSize: 12 }}>
                @company.com — адрес будет зарегистрирован в Microsoft
              </span>
            }
          >
            <Input placeholder="pf-214-fz" addonAfter="@company.com" />
          </Form.Item>

          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={2} placeholder="Краткое описание рассылки" />
          </Form.Item>

          <Form.Item label="Бизнес-линия" name="businessLine">
            <Select
              placeholder="Выберите бизнес-линию"
              allowClear
              options={BUSINESS_LINES.map((bl) => ({ label: bl, value: bl }))}
            />
          </Form.Item>

          <Form.Item label="Тэги">
            <MetaTagsInput value={tags} onChange={setTags} />
          </Form.Item>

          <Form.Item label="Тип рассылки" name="type">
            <Radio.Group>
              <Radio value="regular">Обычная</Radio>
              <Radio value="dynamic">Динамическая (членство по правилу)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="Видимость" name="visibility">
            <Radio.Group>
              <Radio value="Public">Общая — видна всем</Radio>
              <Radio value="Private">Скрытая — только по приглашению</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Скрыть из глобального адресника Microsoft"
            name="hideFromAddressLists"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" loading={loading}>
              Создать рассылку
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
