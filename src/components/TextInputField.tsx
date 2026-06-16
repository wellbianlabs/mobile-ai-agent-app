import { StyleSheet, TextInput } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
  placeholder?: string;
}

/**
 * 텍스트 입력 필드 (지침서 §1 Text Input State).
 * 멀티라인 + 자동 성장. 실시간으로 스토어에 가변 저장된다.
 */
export function TextInputField({ value, onChangeText, editable = true, placeholder }: Props) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      placeholder={placeholder ?? '메시지를 입력하거나, 길게 눌러 말하거나, 사진을 첨부하세요'}
      placeholderTextColor={colors.textMuted}
      multiline
      textAlignVertical="top"
      maxLength={4000}
    />
  );
}

const styles = StyleSheet.create({
  // 패널 내부에 놓이므로 자체 보더/배경 없이 투명하게.
  input: {
    minHeight: 40,
    maxHeight: 130,
    color: colors.text,
    fontSize: 16,
    fontWeight: '300',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: 'transparent',
  },
});
