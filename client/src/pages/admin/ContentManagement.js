import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Archive,
  MoreVertical,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import RichContentEditor from '../../components/admin/RichContentEditor';
import { contentService } from '../../services/contentService';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * Enhanced Content Management Page
 * Advanced content management features with bulk operations, search, filtering, and analytics
 */
const ContentManagement = () => {
  const [phases, setPhases] = useState([]);
  const [filteredPhases, setFilteredPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPhases, setSelectedPhases] = useState(new Set());
  const [showEditor, setShowEditor] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Load phases
  useEffect(() => {
    loadPhases();
  }, []);

  // Filter phases based on search and status
  useEffect(() => {
    let filtered = phases;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(phase =>
        phase.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phase.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(phase => phase.status === statusFilter);
    }

    setFilteredPhases(filtered);
  }, [phases, searchTerm, statusFilter]);

  const loadPhases = async () => {
    try {
      setLoading(true);
      const data = await contentService.getTrainingPhases();
      setPhases(data);
    } catch (error) {
      // console.error('Error loading phases:', error);
      toast.error('Failed to load training phases');
    } finally {
      setLoading(false);
    }
  };

  // Handle phase creation
  const handleCreatePhase = () => {
    setCurrentPhase(null);
    setShowEditor(true);
  };

  // Handle phase editing
  const handleEditPhase = (phase) => {
    setCurrentPhase(phase);
    setShowEditor(true);
  };

  // Handle phase preview - Feature temporarily disabled
  const handlePreviewPhase = (phase) => {
    toast('Preview functionality has been temporarily disabled during system cleanup. Content can be viewed by editing the phase.', { icon: 'ℹ️' });
  };

  // Handle phase save
  const handleSavePhase = async (phaseData) => {
    try {
      if (currentPhase) {
        await contentService.updateTrainingPhase(currentPhase.id, phaseData);
        toast.success('Training phase updated successfully');
      } else {
        await contentService.createTrainingPhase(phaseData);
        toast.success('Training phase created successfully');
      }

      setShowEditor(false);
      setCurrentPhase(null);
      await loadPhases();
    } catch (error) {
      // console.error('Error saving phase:', error);
      toast.error('Failed to save training phase');
    }
  };

  // Handle status change
  const handleStatusChange = async (phaseId, newStatus, notes = '') => {
    try {
      await contentService.updatePhaseStatus(phaseId, newStatus, notes);
      toast.success(`Phase status updated to ${newStatus}`);
      await loadPhases();
    } catch (error) {
      // console.error('Error updating status:', error);
      toast.error('Failed to update phase status');
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedPhases.size === 0) {
      toast.error('Please select phases to perform bulk action');
      return;
    }

    setBulkActionLoading(true);
    try {
      const phaseIds = Array.from(selectedPhases);

      switch (action) {
        case 'publish':
          await Promise.all(phaseIds.map(id =>
            contentService.updatePhaseStatus(id, 'published', 'Bulk published')
          ));
          toast.success(`Published ${phaseIds.length} phases`);
          break;
        case 'archive':
          await Promise.all(phaseIds.map(id =>
            contentService.updatePhaseStatus(id, 'archived', 'Bulk archived')
          ));
          toast.success(`Archived ${phaseIds.length} phases`);
          break;
        case 'draft':
          await Promise.all(phaseIds.map(id =>
            contentService.updatePhaseStatus(id, 'draft', 'Moved to draft')
          ));
          toast.success(`Moved ${phaseIds.length} phases to draft`);
          break;
        default:
          toast.error('Unknown bulk action');
      }

      setSelectedPhases(new Set());
      await loadPhases();
    } catch (error) {
      // console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Toggle phase selection
  const togglePhaseSelection = (phaseId) => {
    const newSelection = new Set(selectedPhases);
    if (newSelection.has(phaseId)) {
      newSelection.delete(phaseId);
    } else {
      newSelection.add(phaseId);
    }
    setSelectedPhases(newSelection);
  };

  // Select all phases
  const selectAllPhases = () => {
    if (selectedPhases.size === filteredPhases.length) {
      setSelectedPhases(new Set());
    } else {
      setSelectedPhases(new Set(filteredPhases.map(phase => phase.id)));
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'pending_approval': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <Edit className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'rejected': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Calculate content statistics
  const getContentStats = () => {
    const stats = {
      total: phases.length,
      published: phases.filter(p => p.status === 'published').length,
      draft: phases.filter(p => p.status === 'draft').length,
      archived: phases.filter(p => p.status === 'archived').length,
      pending: phases.filter(p => p.status === 'pending_approval').length
    };

    return stats;
  };

  const stats = getContentStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600">Manage training phases and content</p>
        </div>
        <button
          onClick={handleCreatePhase}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Phase</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Phases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-green-600">{stats.published}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
            </div>
            <Edit className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Archived</p>
              <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
            </div>
            <Archive className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search phases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedPhases.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedPhases.size} selected
              </span>
              <button
                onClick={() => handleBulkAction('publish')}
                disabled={bulkActionLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors duration-200"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                disabled={bulkActionLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors duration-200"
              >
                Archive
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phases Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPhases.size === filteredPhases.length && filteredPhases.length > 0}
                    onChange={selectAllPhases}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phase
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPhases.map((phase) => (
                <tr key={phase.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedPhases.has(phase.id)}
                      onChange={() => togglePhaseSelection(phase.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      Phase {phase.phase_number}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {phase.title}
                      </div>
                      {phase.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {phase.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(phase.status)}`}>
                      {getStatusIcon(phase.status)}
                      <span className="ml-1 capitalize">{phase.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {phase.items?.length || 0} items
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(phase.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePreviewPhase(phase)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditPhase(phase)}
                        className="text-gray-600 hover:text-gray-700"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPhases.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No training phases found
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first training phase'
              }
            </p>
          </div>
        )}
      </div>

      {/* Rich Content Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {currentPhase ? 'Edit Training Phase' : 'Create Training Phase'}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <RichContentEditor
                phaseData={currentPhase}
                onSave={handleSavePhase}
                onStatusChange={handleStatusChange}
                currentUser={{ name: 'Admin User', role: 'admin' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Preview Modal - Feature removed */}
    </div>
  );
};

export default ContentManagement;
