import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'

const PLATFORM_HANDLE = 'gastro.pistazz.io'

type Restaurant = {
  id: string
  name: string
  instagram_handle: string | null
  primary_color?: string | null
}

type TriggerType = {
  type: string
  label: string
  emoji: string
  points: number
}

type Props = {
  route: {
    params: {
      restaurant: Restaurant
      trigger: TriggerType
    }
  }
  navigation: { goBack: () => void }
}

export default function SubmitScreen({ route, navigation }: Props) {
  const { restaurant, trigger } = route.params

  if (!trigger || !restaurant) return null

  const rawHandle = restaurant.instagram_handle ?? null
  const restaurantHandle = rawHandle ? rawHandle.replace(/^@/, '') : null

  const [link, setLink] = useState('')
  const [caption, setCaption] = useState('')
  const [mediaFile, setMediaFile] = useState<{ uri: string; name: string; type: string } | null>(null)
  const [screenshotFile, setScreenshotFile] = useState<{ uri: string; name: string; type: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [copiedHandle, setCopiedHandle] = useState(false)
  const [copiedPlatform, setCopiedPlatform] = useState(false)
  const [instagramOpened, setInstagramOpened] = useState(false)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const returnedFromIG = useRef(false)

  const isStory = trigger.type === 'instagram_story'
  const isReel = trigger.type === 'instagram_reel'
  const isPost = trigger.type === 'instagram_post'
  const isGoogle = trigger.type === 'google_review'
  const isReceipt = trigger.type === 'receipt_upload'

  useEffect(() => {
    if (!isStory) return
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        if (instagramOpened && !returnedFromIG.current) {
          returnedFromIG.current = true
          setStep(3)
        }
      }
      appStateRef.current = next
    })
    return () => sub.remove()
  }, [isStory, instagramOpened])

  function copyTag(text: string, which: 'handle' | 'platform') {
    Clipboard.setString(text)
    if (which === 'handle') setCopiedHandle(true)
    else setCopiedPlatform(true)
  }

  async function openInstagram() {
    try {
      if (Platform.OS !== 'web') {
        await Linking.openURL('instagram://story-camera')
      } else {
        window.open('https://www.instagram.com', '_blank')
      }
    } catch {
      Linking.openURL('https://www.instagram.com')
    }
    setInstagramOpened(true)
    setStep(2)
  }

  async function pickMedia(type: 'screenshot' | 'receipt') {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const fileObj = {
        uri: asset.uri,
        name: asset.fileName ?? `${type}-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      }
      if (type === 'screenshot') setScreenshotFile(fileObj)
      else setMediaFile(fileObj)
    }
  }

  const canSubmit = useCallback(() => {
    if (isStory) return screenshotFile !== null
    if (isReel || isPost) return link.trim().length > 0
    if (isGoogle) return link.trim().length > 0
    if (isReceipt) return mediaFile !== null
    return false
  }, [isStory, isReel, isPost, isGoogle, isReceipt, screenshotFile, link, mediaFile])

  async function handleSubmit() {
    if (!canSubmit()) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { Alert.alert('Fehler', 'Nicht angemeldet.'); setLoading(false); return }

      const formData = new FormData()
      formData.append('restaurant_id', restaurant.id)
      formData.append('type', trigger.type)
      if (link) formData.append('instagram_permalink', link)
      if (caption) formData.append('caption', caption)
      if (screenshotFile) formData.append('screenshot', { uri: screenshotFile.uri, name: screenshotFile.name, type: screenshotFile.type } as unknown as Blob)
      if (mediaFile) formData.append('media', { uri: mediaFile.uri, name: mediaFile.name, type: mediaFile.type } as unknown as Blob)

      const res = await fetch('https://gastro.pistazz.io/api/stories/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Fehler')
      Alert.alert('✅ Eingereicht!', `Wird geprüft. Du erhältst ${trigger.points} Punkte nach Bestätigung.`, [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (err: unknown) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  const color = restaurant.primary_color ?? '#22c55e'

  const CopyButton = ({ handle, which, copied }: { handle: string; which: 'handle' | 'platform'; copied: boolean }) => (
    <TouchableOpacity
      style={[styles.copyBtn, copied && styles.copyBtnDone]}
      onPress={() => copyTag(`@${handle}`, which)}
      activeOpacity={0.7}
    >
      <View style={styles.copyLeft}>
        <Text style={styles.copyHandle}>@{handle}</Text>
        {!copied && <Text style={styles.copyHint}>👆 Hier tippen — wird automatisch kopiert</Text>}
      </View>
      <View style={[styles.copyBadge, copied && styles.copyBadgeDone]}>
        <Text style={styles.copyBadgeText}>{copied ? '✓ Kopiert!' : 'Kopieren'}</Text>
      </View>
    </TouchableOpacity>
  )

  const TagChecklist = () => (
    <View style={styles.checklist}>
      <Text style={styles.checklistTitle}>Checkliste:</Text>
      <Text style={copiedHandle ? styles.checkDone : styles.checkOpen}>
        {copiedHandle ? '✅' : '⬜'} {restaurantHandle ? `@${restaurantHandle}` : 'Restaurant-Tag'} kopiert
      </Text>
      <Text style={copiedPlatform ? styles.checkDone : styles.checkOpen}>
        {copiedPlatform ? '✅' : '⬜'} @{PLATFORM_HANDLE} kopiert
      </Text>
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Zurück</Text>
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: color + '33' }]}>
          <Text style={[styles.badgeText, { color }]}>+{trigger.points} Punkte</Text>
        </View>
      </View>

      <Text style={styles.title}>{trigger.emoji} {trigger.label}</Text>
      <Text style={styles.subtitle}>{restaurant.name}</Text>

      {/* ── INSTAGRAM STORY ── */}
      {isStory && (
        <>
          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>So sammelst du deine Punkte:</Text>

              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepDotText}>1</Text></View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>Tags kopieren & in Instagram einfügen</Text>
                  <Text style={styles.stepDesc}>Tippe einfach auf den grünen Button — er kopiert den Tag automatisch. Dann in Instagram als @Mention-Sticker einfügen.</Text>
                  <View style={styles.gap}>
                    {restaurantHandle
                      ? <CopyButton handle={restaurantHandle} which="handle" copied={copiedHandle} />
                      : <View style={styles.noHandle}><Text style={styles.noHandleText}>⚠️ Kein Instagram-Handle hinterlegt</Text></View>
                    }
                    <CopyButton handle={PLATFORM_HANDLE} which="platform" copied={copiedPlatform} />
                    <TagChecklist />
                  </View>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepDotText}>2</Text></View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>Story erstellen & teilen</Text>
                  <Text style={styles.stepDesc}>Erstelle deine Story mit den Tags und tippe auf "Teilen".</Text>
                </View>
              </View>

              <View style={[styles.stepRow, styles.stepRowRed]}>
                <View style={[styles.stepDot, { backgroundColor: '#ef4444' }]}><Text style={styles.stepDotText}>3</Text></View>
                <View style={styles.stepBody}>
                  <Text style={[styles.stepTitle, { color: '#ef4444' }]}>Screenshot machen & hochladen</Text>
                  <Text style={styles.stepDesc}>Mache sofort nach dem Teilen einen Screenshot — beide Tags müssen sichtbar sein. Komm zurück und lade ihn hoch.</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.btnDark} onPress={openInstagram}>
                <Text style={styles.btnText}>📸 Story erstellen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGray} onPress={() => setStep(3)}>
                <Text style={styles.btnGrayText}>Story geteilt — Screenshot hochladen →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⏳ Zurück aus Instagram?</Text>
              <Text style={styles.stepDesc}>Mache jetzt einen Screenshot deiner Story und lade ihn hoch.</Text>
              <TouchableOpacity style={[styles.btnDark, { backgroundColor: color, marginTop: 16 }]} onPress={() => setStep(3)}>
                <Text style={styles.btnText}>Weiter zum Screenshot-Upload</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📤 Screenshot hochladen</Text>
              <Text style={styles.stepDesc}>Der Screenshot muss den Zeitstempel und beide Tags zeigen.</Text>

              <TagChecklist />

              <TouchableOpacity style={[styles.uploadBtn, { marginTop: 14 }]} onPress={() => pickMedia('screenshot')}>
                {screenshotFile
                  ? <Image source={{ uri: screenshotFile.uri }} style={styles.preview} />
                  : <><Text style={styles.uploadIcon}>🖼️</Text><Text style={styles.uploadText}>Screenshot auswählen</Text><Text style={styles.uploadHint}>Tippe um dein Fotoalbum zu öffnen</Text></>
                }
              </TouchableOpacity>
              {screenshotFile && (
                <TouchableOpacity style={styles.changeBtn} onPress={() => pickMedia('screenshot')}>
                  <Text style={styles.changeBtnText}>Anderes Bild wählen</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.fraud}>
            <Text style={styles.fraudTitle}>⚠️ Wichtiger Hinweis</Text>
            <Text style={styles.fraudText}>Jede Einreichung wird automatisch von einer KI geprüft. Manipulationsversuche und gefälschte Screenshots werden erkannt und führen zur sofortigen Sperrung des Kontos.</Text>
          </View>

          {step === 3 && (
            <TouchableOpacity style={[styles.submitBtn, !canSubmit() && styles.submitBtnOff]} onPress={handleSubmit} disabled={!canSubmit() || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Einreichen → {trigger.points} Punkte</Text>}
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── REEL / POST ── */}
      {(isReel || isPost) && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tags kopieren:</Text>
            <View style={styles.gap}>
              {restaurantHandle
                ? <CopyButton handle={restaurantHandle} which="handle" copied={copiedHandle} />
                : <View style={styles.noHandle}><Text style={styles.noHandleText}>⚠️ Kein Handle hinterlegt</Text></View>
              }
              <CopyButton handle={PLATFORM_HANDLE} which="platform" copied={copiedPlatform} />
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Instagram-Link *</Text>
            <TextInput style={styles.input} placeholder={isReel ? 'https://www.instagram.com/reel/...' : 'https://www.instagram.com/p/...'} placeholderTextColor="#555" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" />
            <TextInput style={[styles.input, { marginTop: 10, minHeight: 70 }]} placeholder="Beschreibung (optional)" placeholderTextColor="#555" value={caption} onChangeText={setCaption} multiline />
          </View>
          <TouchableOpacity style={[styles.submitBtn, !canSubmit() && styles.submitBtnOff]} onPress={handleSubmit} disabled={!canSubmit() || loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Einreichen → {trigger.points} Punkte</Text>}
          </TouchableOpacity>
        </>
      )}

      {/* ── GOOGLE ── */}
      {isGoogle && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⭐ Google Bewertung</Text>
            <Text style={styles.stepDesc}>Bewerte {restaurant.name} auf Google Maps und füge den Link ein.</Text>
            <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="https://maps.google.com/..." placeholderTextColor="#555" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" />
          </View>
          <TouchableOpacity style={[styles.submitBtn, !canSubmit() && styles.submitBtnOff]} onPress={handleSubmit} disabled={!canSubmit() || loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Einreichen → {trigger.points} Punkte</Text>}
          </TouchableOpacity>
        </>
      )}

      {/* ── KASSENBON ── */}
      {isReceipt && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧾 Kassenbon hochladen</Text>
            <Text style={styles.stepDesc}>Fotografiere deinen Kassenbon von {restaurant.name}.</Text>
            <TouchableOpacity style={[styles.uploadBtn, { marginTop: 12 }]} onPress={() => pickMedia('receipt')}>
              {mediaFile
                ? <Image source={{ uri: mediaFile.uri }} style={styles.preview} />
                : <><Text style={styles.uploadIcon}>📷</Text><Text style={styles.uploadText}>Foto auswählen</Text><Text style={styles.uploadHint}>Tippe um dein Fotoalbum zu öffnen</Text></>
              }
            </TouchableOpacity>
            {mediaFile && <TouchableOpacity style={styles.changeBtn} onPress={() => pickMedia('receipt')}><Text style={styles.changeBtnText}>Anderes Bild wählen</Text></TouchableOpacity>}
          </View>
          <TouchableOpacity style={[styles.submitBtn, !canSubmit() && styles.submitBtnOff]} onPress={handleSubmit} disabled={!canSubmit() || loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Einreichen → {trigger.points} Punkte</Text>}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 16, paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backText: { color: '#888', fontSize: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontWeight: '700', fontSize: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 20 },
  card: { backgroundColor: '#1c1c1c', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepRowRed: { backgroundColor: '#1a0505', borderRadius: 12, padding: 10 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepDotText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepBody: { flex: 1 },
  stepTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  stepDesc: { color: '#aaa', fontSize: 13, lineHeight: 19 },
  gap: { gap: 10, marginTop: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderRadius: 12, borderWidth: 1.5, borderColor: '#2a2a2a', paddingHorizontal: 14, paddingVertical: 13 },
  copyBtnDone: { borderColor: '#22c55e', backgroundColor: '#0a1a0a' },
  copyLeft: { flex: 1, gap: 3 },
  copyHandle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  copyHint: { color: '#555', fontSize: 11 },
  copyBadge: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 10 },
  copyBadgeDone: { backgroundColor: '#166534' },
  copyBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  checklist: { backgroundColor: '#0a0a0a', borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: '#1a1a1a' },
  checklistTitle: { color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  checkDone: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  checkOpen: { color: '#555', fontSize: 13 },
  noHandle: { backgroundColor: '#1a1200', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#713f12' },
  noHandleText: { color: '#fbbf24', fontSize: 12 },
  sectionLabel: { color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  btnDark: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, backgroundColor: '#111' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnGray: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: '#2a2a2a' },
  btnGrayText: { color: '#ccc', fontWeight: '600', fontSize: 15 },
  uploadBtn: { backgroundColor: '#111', borderRadius: 12, borderWidth: 2, borderColor: '#2a2a2a', borderStyle: 'dashed', minHeight: 150, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadIcon: { fontSize: 36, marginBottom: 8 },
  uploadText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  uploadHint: { color: '#555', fontSize: 12, marginTop: 4 },
  preview: { width: '100%', height: 220, borderRadius: 10 },
  changeBtn: { marginTop: 8, alignItems: 'center' },
  changeBtnText: { color: '#666', fontSize: 13 },
  input: { backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', color: '#fff', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  fraud: { backgroundColor: '#1a0505', borderWidth: 1, borderColor: '#7f1d1d', borderRadius: 12, padding: 14, marginBottom: 16 },
  fraudTitle: { color: '#ef4444', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  fraudText: { color: '#fca5a5', fontSize: 13, lineHeight: 20 },
  submitBtn: { backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  submitBtnOff: { backgroundColor: '#1a1a1a' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 17 },
})
