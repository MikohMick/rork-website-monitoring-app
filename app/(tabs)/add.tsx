import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Save } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useWebsiteMonitor } from '@/hooks/useWebsiteMonitorBackend';

interface WebsiteInput {
  id: string;
  name: string;
  url: string;
}

export default function AddScreen() {
  const { colors } = useTheme();
  const websiteMonitor = useWebsiteMonitor();
  const [websites, setWebsites] = useState<WebsiteInput[]>([
    { id: '1', name: '', url: '' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle case where hook returns undefined
  if (!websiteMonitor) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Loading website monitor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { addMultipleWebsites } = websiteMonitor;

  const addWebsiteInput = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newId = (websites.length + 1).toString();
    setWebsites([...websites, { id: newId, name: '', url: '' }]);
  };

  const removeWebsiteInput = (id: string) => {
    if (websites.length === 1) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWebsites(websites.filter(site => site.id !== id));
  };

  const updateWebsite = (id: string, field: 'name' | 'url', value: string) => {
    setWebsites(websites.map(site => 
      site.id === id ? { ...site, [field]: value } : site
    ));
  };

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    
    // Add protocol if missing
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    try {
      new URL(fullUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (isLoading) return;
    
    const validWebsites = websites.filter(site => 
      site.name.trim() && site.url.trim()
    );

    if (validWebsites.length === 0) {
      Alert.alert('Error', 'Please add at least one website with both name and URL.');
      return;
    }

    const invalidUrls = validWebsites.filter(site => !validateUrl(site.url));
    if (invalidUrls.length > 0) {
      Alert.alert(
        'Invalid URLs', 
        'Please check the following URLs:\n' + 
        invalidUrls.map(site => `• ${site.name}: ${site.url}`).join('\n')
      );
      return;
    }

    setIsLoading(true);

    try {
      const websiteData = validWebsites.map(site => ({
        name: site.name.trim(),
        url: site.url.startsWith('http') ? site.url.trim() : `https://${site.url.trim()}`,
      }));
      
      await addMultipleWebsites(websiteData);

      setWebsites([{ id: '1', name: '', url: '' }]);
      
      router.push('/');
      
      Alert.alert(
        'Success', 
        `Added ${validWebsites.length} website${validWebsites.length > 1 ? 's' : ''} for monitoring.`
      );
    } catch (error) {
      console.log('Save error:', error);
      Alert.alert('Error', 'Failed to add websites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasValidData = websites.some(site => site.name.trim() && site.url.trim());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Add Websites to Monitor
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter the websites you want to monitor for uptime
            </Text>
          </View>

          {websites.map((website, index) => (
            <View 
              key={website.id} 
              style={[styles.websiteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Website {index + 1}
                </Text>
                {websites.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeWebsiteInput(website.id)}
                    style={styles.removeButton}
                  >
                    <Trash2 color={colors.error} size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Website Name
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background, 
                    borderColor: colors.border,
                    color: colors.text 
                  }]}
                  placeholder="e.g., My Blog"
                  placeholderTextColor={colors.textSecondary}
                  value={website.name}
                  onChangeText={(text) => updateWebsite(website.id, 'name', text)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Website URL
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background, 
                    borderColor: colors.border,
                    color: colors.text 
                  }]}
                  placeholder="e.g., example.com or https://example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={website.url}
                  onChangeText={(text) => updateWebsite(website.id, 'url', text)}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addButton, { borderColor: colors.border }]}
            onPress={addWebsiteInput}
          >
            <Plus color={colors.primary} size={20} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>
              Add Another Website
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { 
                backgroundColor: hasValidData ? colors.primary : colors.border,
                opacity: isLoading ? 0.7 : 1,
              }
            ]}
            onPress={handleSave}
            disabled={!hasValidData || isLoading}
            testID="save-button"
          >
            <Save color={hasValidData ? colors.background : colors.textSecondary} size={20} />
            <Text style={[
              styles.saveButtonText,
              { color: hasValidData ? colors.background : colors.textSecondary }
            ]}>
              {isLoading ? 'Saving...' : 'Save Websites'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  websiteCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
  },
});