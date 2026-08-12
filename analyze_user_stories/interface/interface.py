from abc import ABC, abstractmethod

class AlgorithmsStrategy(ABC):
    @abstractmethod
    def calculate(self, w1, w2, beta1=None, beta2=None, bias_b=None):
        pass