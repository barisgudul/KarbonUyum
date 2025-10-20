### backend/services/calculation_interface.py
"""
Abstract interface for calculation service providers.

This interface ensures that all calculation service implementations
(Climatiq API, internal fallback, future providers) follow the same contract.
"""

from abc import ABC, abstractmethod
import schemas


class ICalculationService(ABC):
    """
    Abstract base class defining the interface for emission calculation services.
    
    All calculation service implementations must inherit from this class and implement
    all abstract methods. This allows for pluggable providers without coupling to main.py.
    """
    
    @abstractmethod
    def calculate_for_activity(
        self, 
        activity_data: schemas.ActivityDataBase
    ) -> schemas.EmissionCalculationResult:
        """
        Calculate CO2e emissions for a given activity.
        
        Args:
            activity_data: The activity data to calculate emissions for
            
        Returns:
            EmissionCalculationResult: Detailed calculation result with metadata
            
        Raises:
            ValueError: If activity_data is invalid
            Exception: If calculation fails unexpectedly
        """
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """
        Get the name of this calculation provider.
        
        Returns:
            str: Provider name (e.g., "climatiq", "internal_fallback")
        """
        pass
    
    @abstractmethod
    def health_check(self) -> bool:
        """
        Check if this calculation provider is available and functional.
        
        Returns:
            bool: True if provider is healthy, False otherwise
        """
        pass
