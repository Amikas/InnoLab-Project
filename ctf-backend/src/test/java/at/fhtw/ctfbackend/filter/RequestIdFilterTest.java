package at.fhtw.ctfbackend.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.MDC;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RequestIdFilterTest {

    @Test
    void replacesInvalidClientSuppliedIdsAndClearsMdc() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        when(request.getHeader(RequestIdFilter.HEADER)).thenReturn("invalid\nrequest-id");

        new RequestIdFilter().doFilterInternal(request, response, chain);

        ArgumentCaptor<String> id = ArgumentCaptor.forClass(String.class);
        verify(response).setHeader(org.mockito.ArgumentMatchers.eq(RequestIdFilter.HEADER), id.capture());
        assertFalse(id.getValue().contains("\n"));
        assertEquals(null, MDC.get(RequestIdFilter.MDC_KEY));
    }

    @Test
    void preservesValidClientSuppliedIds() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        when(request.getHeader(RequestIdFilter.HEADER)).thenReturn("proxy-123_abc");

        new RequestIdFilter().doFilterInternal(request, response, chain);

        verify(response).setHeader(RequestIdFilter.HEADER, "proxy-123_abc");
    }
}
